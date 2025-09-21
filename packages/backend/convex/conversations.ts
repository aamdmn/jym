import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Types for conversation context
export interface ConversationContext {
  user: {
    fitnessLevel?: string;
    currentGoals?: string[];
    preferences?: any;
  };
  session: {
    startTime: number;
    lastActivity: number;
    messageCount: number;
    isWaiting: boolean;
    waitingFor?: string;
  };
  llm: {
    lastResponseId?: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp: number;
      toolCalls?: any[];
      toolResults?: any[];
    }>;
    systemState?: any;
  };
  domain?: any;
}

// Create or get active conversation
export const getOrCreateConversation = mutation({
  args: {
    telegramId: v.number(),
    chatId: v.number(),
    type: v.string(),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { telegramId, chatId, type, conversationId } = args;

    // If conversationId provided, try to get existing conversation
    if (conversationId) {
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_conversation_id", (q) =>
          q.eq("conversationId", conversationId)
        )
        .first();

      if (existing && existing.status === "active") {
        return existing;
      }
    }

    // Look for existing active conversation of this type
    const activeConversation = await ctx.db
      .query("conversations")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", telegramId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), type),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("chatId"), chatId)
        )
      )
      .first();

    if (activeConversation) {
      return activeConversation;
    }

    // Create new conversation
    const newConversationId =
      conversationId || `${type}_${telegramId}_${Date.now()}`;
    const now = Date.now();

    const context: ConversationContext = {
      user: {},
      session: {
        startTime: now,
        lastActivity: now,
        messageCount: 0,
        isWaiting: false,
      },
      llm: {
        messages: [],
      },
    };

    const conversationDoc = await ctx.db.insert("conversations", {
      telegramId,
      chatId,
      conversationId: newConversationId,
      type,
      status: "active",
      context,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(conversationDoc);
  },
});

// Update conversation context
export const updateConversationContext = mutation({
  args: {
    conversationId: v.string(),
    context: v.any(),
    currentStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { conversationId, context, currentStep } = args;

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversationId)
      )
      .first();

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const updates: any = {
      context,
      updatedAt: Date.now(),
    };

    if (currentStep !== undefined) {
      updates.currentStep = currentStep;
    }

    // Update last activity in session context
    if (context.session) {
      context.session.lastActivity = Date.now();
    }

    await ctx.db.patch(conversation._id, updates);
    return await ctx.db.get(conversation._id);
  },
});

// Add message to conversation
export const addMessage = mutation({
  args: {
    conversationId: v.string(),
    role: v.string(),
    content: v.string(),
    toolCalls: v.optional(v.array(v.any())),
    toolResults: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const { conversationId, role, content, toolCalls, toolResults } = args;

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversationId)
      )
      .first();

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const newMessage = {
      role,
      content,
      timestamp: Date.now(),
      ...(toolCalls && { toolCalls }),
      ...(toolResults && { toolResults }),
    };

    const updatedContext = { ...conversation.context };
    updatedContext.llm.messages.push(newMessage);
    updatedContext.session.messageCount++;
    updatedContext.session.lastActivity = Date.now();

    // Trim messages if too many (keep last 50)
    if (updatedContext.llm.messages.length > 50) {
      updatedContext.llm.messages = updatedContext.llm.messages.slice(-50);
    }

    await ctx.db.patch(conversation._id, {
      context: updatedContext,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(conversation._id);
  },
});

// Update LLM response ID for persistence
export const updateResponseId = mutation({
  args: {
    conversationId: v.string(),
    responseId: v.string(),
  },
  handler: async (ctx, args) => {
    const { conversationId, responseId } = args;

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversationId)
      )
      .first();

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const updatedContext = { ...conversation.context };
    updatedContext.llm.lastResponseId = responseId;

    await ctx.db.patch(conversation._id, {
      context: updatedContext,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(conversation._id);
  },
});

// Get conversation by ID
export const getConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .first();
  },
});

// Get active conversations for user
export const getActiveConversations = query({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

// Complete conversation
export const completeConversation = mutation({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .first();

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(conversation._id, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return await ctx.db.get(conversation._id);
  },
});

// Create conversation snapshot
export const createSnapshot = mutation({
  args: {
    conversationId: v.string(),
    step: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const { conversationId, step, data } = args;

    return await ctx.db.insert("conversationSnapshots", {
      conversationId,
      step,
      snapshotData: data,
      timestamp: Date.now(),
    });
  },
});

// Get latest snapshot
export const getLatestSnapshot = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversationSnapshots")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .first();
  },
});
