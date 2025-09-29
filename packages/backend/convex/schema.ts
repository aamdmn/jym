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

  // Triggers for scheduled proactive messages
  triggers: defineTable({
    userId: v.string(), // User who the trigger belongs to
    phoneNumber: v.string(), // Phone number to send the message to
    triggerMessage: v.string(), // The message/context for the agent
    scheduledTime: v.number(), // When the trigger should fire (timestamp)
    threadId: v.optional(v.string()), // Agent thread ID if available
    metadata: v.optional(
      v.object({
        type: v.optional(v.string()), // Type of trigger (e.g., "workout_reminder")
        context: v.optional(v.string()), // Additional context for the trigger
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")), // Reference to the scheduled function
    createdAt: v.number(), // When the trigger was created
    completedAt: v.optional(v.number()), // When the trigger was completed/failed/cancelled
    error: v.optional(v.string()), // Error message if failed
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_scheduled_time", ["scheduledTime"])
    .index("by_user_and_status", ["userId", "status"]),

  workouts: defineTable({
    userId: v.string(),
    threadId: v.string(),
    date: v.string(), // YYYY-MM-DD
    exercises: v.array(
      v.object({
        name: v.string(),
        slug: v.string(), // URL-friendly identifier for exercise (e.g., "pushups", "squats")
        sets: v.optional(v.number()),
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()), // For time-based exercises like planks
        unit: v.optional(v.string()), // "seconds", "minutes", "lbs", "kg", etc.
        completed: v.boolean(),
        feedback: v.optional(v.string()),
      })
    ),
    completed: v.boolean(),
    currentExerciseIndex: v.number(), // Track which exercise is currently active
  })
    .index("by_thread", ["threadId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_active", ["userId", "completed"]), // Index for finding active workouts
});
