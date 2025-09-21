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
  }).index("by_telegram_id", ["telegramId"]),

  // Comprehensive conversation state management
  conversations: defineTable({
    telegramId: v.number(),
    chatId: v.number(),
    conversationId: v.string(), // unique identifier for conversation instance
    type: v.string(), // "onboarding", "fitness_chat", "workout_session"
    status: v.string(), // "active", "paused", "completed", "cancelled"
    currentStep: v.optional(v.string()),
    context: v.object({
      // User context
      user: v.object({
        fitnessLevel: v.optional(v.string()),
        currentGoals: v.optional(v.array(v.string())),
        preferences: v.optional(v.any()),
      }),
      // Conversation context
      session: v.object({
        startTime: v.number(),
        lastActivity: v.number(),
        messageCount: v.number(),
        isWaiting: v.boolean(),
        waitingFor: v.optional(v.string()),
      }),
      // LLM context
      llm: v.object({
        lastResponseId: v.optional(v.string()),
        messages: v.array(
          v.object({
            role: v.string(),
            content: v.string(),
            timestamp: v.number(),
            toolCalls: v.optional(v.array(v.any())),
            toolResults: v.optional(v.array(v.any())),
          })
        ),
        systemState: v.optional(v.any()),
      }),
      // Domain-specific context
      domain: v.optional(v.any()),
    }),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_telegram_id", ["telegramId"])
    .index("by_chat_id", ["chatId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

  // Conversation history snapshots for recovery
  conversationSnapshots: defineTable({
    conversationId: v.string(),
    snapshotData: v.any(),
    step: v.string(),
    timestamp: v.number(),
  }).index("by_conversation_id", ["conversationId"]),

  // Onboarding sessions (legacy support, will migrate to conversations)
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
