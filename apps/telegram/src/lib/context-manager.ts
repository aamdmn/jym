import { api } from "@jym/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Context } from "grammy";
import type {
  ComprehensiveContext,
  ConversationRecord,
  ConversationType,
  LLMMessage,
  MyConversation,
  UserContext,
} from "./types";

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  throw new Error("CONVEX_URL environment variable is not set");
}
const convex = new ConvexHttpClient(convexUrl);

export class ConversationContextManager {
  private conversationId?: string;
  private context?: ComprehensiveContext;

  constructor(conversationId?: string) {
    this.conversationId = conversationId;
  }

  // Initialize conversation context
  async initialize(
    telegramId: number,
    chatId: number,
    type: ConversationType,
    conversationId?: string
  ): Promise<ConversationRecord> {
    const conversation = await convex.mutation(
      api.conversations.getOrCreateConversation,
      {
        telegramId,
        chatId,
        type,
        conversationId,
      }
    );

    this.conversationId = conversation.conversationId;
    this.context = conversation.context;
    return conversation;
  }

  // Get current context
  getContext(): ComprehensiveContext | undefined {
    return this.context;
  }

  // Update context and persist to database
  async updateContext(
    updates: Partial<ComprehensiveContext>,
    currentStep?: string
  ): Promise<ConversationRecord | null> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }

    // Merge updates with current context
    this.context = {
      ...this.context,
      ...updates,
      session: {
        ...this.context?.session,
        ...updates.session,
        lastActivity: Date.now(),
      },
    } as ComprehensiveContext;

    const updatedConversation = await convex.mutation(
      api.conversations.updateConversationContext,
      {
        conversationId: this.conversationId,
        context: this.context,
        currentStep,
      }
    );

    return updatedConversation;
  }

  // Add message to conversation
  async addMessage(
    role: "user" | "assistant" | "system",
    content: string,
    toolCalls?: unknown[],
    toolResults?: unknown[]
  ): Promise<ConversationRecord | null> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }

    const conversation = await convex.mutation(api.conversations.addMessage, {
      conversationId: this.conversationId,
      role,
      content,
      toolCalls,
      toolResults,
    });

    if (conversation) {
      this.context = conversation.context;
    }

    return conversation;
  }

  // Update LLM response ID for persistence
  async updateResponseId(
    responseId: string
  ): Promise<ConversationRecord | null> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }

    const conversation = await convex.mutation(
      api.conversations.updateResponseId,
      {
        conversationId: this.conversationId,
        responseId,
      }
    );

    if (conversation) {
      this.context = conversation.context;
    }

    return conversation;
  }

  // Get LLM messages for agent
  getLLMMessages(): LLMMessage[] {
    return this.context?.llm.messages || [];
  }

  // Get last response ID for LLM persistence
  getLastResponseId(): string | undefined {
    return this.context?.llm.lastResponseId;
  }

  // Update user context
  async updateUserContext(userUpdates: Partial<UserContext>): Promise<void> {
    await this.updateContext({
      user: {
        ...this.context?.user,
        ...userUpdates,
      },
    });
  }

  // Set waiting state
  async setWaiting(waitingFor?: string, isWaiting = true): Promise<void> {
    const currentSession = this.context?.session;
    if (!currentSession) {
      throw new Error("No session context available");
    }
    await this.updateContext({
      session: {
        ...currentSession,
        isWaiting,
        waitingFor,
      },
    });
  }

  // Complete conversation
  async complete(): Promise<void> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }

    await convex.mutation(api.conversations.completeConversation, {
      conversationId: this.conversationId,
    });
  }

  // Create snapshot for complex conversation states
  async createSnapshot(step: string, data: unknown): Promise<void> {
    if (!this.conversationId) {
      throw new Error("Conversation not initialized");
    }

    await convex.mutation(api.conversations.createSnapshot, {
      conversationId: this.conversationId,
      step,
      data,
    });
  }

  // Get conversation ID
  getConversationId(): string | undefined {
    return this.conversationId;
  }

  // Check if user is new (no conversation history)
  isNewUser(): boolean {
    const messages = this.context?.llm.messages || [];
    return messages.length === 0;
  }

  // Get conversation summary for LLM context
  getConversationSummary(): string {
    const context = this.context;
    if (!context) return "";

    const { user, session, llm } = context;
    const messageCount = session.messageCount;
    const lastActivity = new Date(session.lastActivity).toLocaleTimeString();

    let summary = "Conversation Context:\n";
    summary += `- Messages exchanged: ${messageCount}\n`;
    summary += `- Last activity: ${lastActivity}\n`;

    if (user.fitnessLevel) {
      summary += `- Fitness level: ${user.fitnessLevel}\n`;
    }

    if (user.currentGoals?.length) {
      summary += `- Goals: ${user.currentGoals.join(", ")}\n`;
    }

    if (llm.conversationMemory?.userMood) {
      summary += `- User mood: ${llm.conversationMemory.userMood}\n`;
    }

    if (llm.conversationMemory?.lastWorkoutType) {
      summary += `- Last workout: ${llm.conversationMemory.lastWorkoutType}\n`;
    }

    return summary;
  }

  // Update conversation memory for better LLM context
  async updateConversationMemory(memory: {
    summary?: string;
    keyPoints?: string[];
    userMood?: string;
    lastWorkoutType?: string;
  }): Promise<void> {
    const currentLlm = this.context?.llm;
    if (!currentLlm) {
      throw new Error("No LLM context available");
    }
    const currentMemory = currentLlm.conversationMemory || {};
    await this.updateContext({
      llm: {
        ...currentLlm,
        conversationMemory: {
          ...currentMemory,
          ...memory,
        },
      },
    });
  }
}

// Utility to create context manager from conversation or context
export function createContextManager(
  _conversation?: MyConversation,
  _ctx?: Context
): ConversationContextManager {
  // Extract conversation ID from grammy conversation external context if available
  // We'll set this up when we implement the actual conversation builders
  // For now, create with undefined ID and initialize as needed
  return new ConversationContextManager();
}

// Helper to get or create user data from Convex
export async function getOrCreateUser(userInfo: {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}) {
  const { telegramId, username, firstName, lastName } = userInfo;

  // Try to get existing user
  let user = await convex.query(api.users.get, { telegramId });

  if (!user) {
    // Create new user
    await convex.mutation(api.users.create, {
      telegramId,
      username: username || "",
      firstName: firstName || "",
      lastName: lastName || "",
      onboardingComplete: false,
      fitnessLevel: "",
      goals: "",
      equipment: "",
      injuries: "",
    });
    user = await convex.query(api.users.get, { telegramId });
  }

  return user;
}
