import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User management is handled by BetterAuth plugin
  // Additional user profile data for fitness coaching
  userProfiles: defineTable({
    userId: v.string(), // BetterAuth user ID
    telegramId: v.optional(v.number()),
    platform: v.string(), // "sms", "loopmessage (iMessage)" or "whatsapp", later on telegram
    onboardingComplete: v.boolean(),
    fitnessLevel: v.string(),
    goals: v.string(),
    equipment: v.string(),
    injuries: v.string(),
    mesuringSystem: v.union(v.literal("metric"), v.literal("imperial")),
    lastWorkoutDate: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_telegram_id", ["telegramId"])
    .index("by_platform", ["platform"]),
});
