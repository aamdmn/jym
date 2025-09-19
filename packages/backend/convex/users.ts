import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getUserByTelegramId = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();
  },
});

export const createUser = mutation({
  args: {
    username: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    telegramId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      username: args.username || "",
      firstName: args.firstName || "",
      lastName: args.lastName || "",
      telegramId: args.telegramId,
      onboardingComplete: false,
      fitnessLevel: "",
      goals: "",
      equipment: "",
      injuries: "",
    });
  },
});

export const updateFitnessLevel = mutation({
  args: {
    telegramId: v.number(),
    fitnessLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      fitnessLevel: args.fitnessLevel,
    });
  },
});

export const updateGoals = mutation({
  args: {
    telegramId: v.number(),
    goals: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      goals: args.goals,
    });
  },
});

export const updateEquipment = mutation({
  args: {
    telegramId: v.number(),
    equipment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      equipment: args.equipment,
    });
  },
});

export const updateInjuries = mutation({
  args: {
    telegramId: v.number(),
    injuries: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      injuries: args.injuries,
    });
  },
});

export const completeOnboarding = mutation({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingComplete: true,
    });
  },
});

// Onboarding session management
export const createOnboardingSession = mutation({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("onboardingSessions", {
      telegramId: args.telegramId,
      currentQuestionIndex: 0,
      conversationHistory: [],
      isComplete: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getOnboardingSession = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboardingSessions")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .filter((q) => q.eq(q.field("isComplete"), false))
      .first();
  },
});

export const updateOnboardingSession = mutation({
  args: {
    telegramId: v.number(),
    currentQuestionIndex: v.number(),
    conversationHistory: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("onboardingSessions")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .filter((q) => q.eq(q.field("isComplete"), false))
      .first();

    if (!session) {
      throw new Error("Onboarding session not found");
    }

    await ctx.db.patch(session._id, {
      currentQuestionIndex: args.currentQuestionIndex,
      conversationHistory: args.conversationHistory,
      isComplete: args.isComplete ?? false,
      updatedAt: Date.now(),
    });
  },
});

// Conversation persistence
export const updateConversationHistory = mutation({
  args: {
    telegramId: v.number(),
    conversationHistory: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    lastResponseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      conversationHistory: args.conversationHistory,
      lastResponseId: args.lastResponseId,
    });
  },
});

export const getConversationHistory = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("telegramId"), args.telegramId))
      .first();

    return user?.conversationHistory || [];
  },
});
