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
