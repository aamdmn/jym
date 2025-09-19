import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    telegramId: v.number(),
    onboardingComplete: v.boolean(),
    fitnessLevel: v.string(),
    goals: v.string(),
    equipment: v.string(),
    injuries: v.string(),
    lastWorkoutDate: v.optional(v.string()),
    // Add conversation persistence
    lastResponseId: v.optional(v.string()),
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.string(),
          content: v.string(),
          timestamp: v.number(),
        })
      )
    ),
  }),

  // Track onboarding sessions
  onboardingSessions: defineTable({
    telegramId: v.number(),
    currentQuestionIndex: v.number(),
    conversationHistory: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    isComplete: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_telegram_id", ["telegramId"]),
});
