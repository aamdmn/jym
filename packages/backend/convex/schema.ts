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
    platform: v.optional(v.string()), // Messaging platform: "telegram", "sms", "loopmessage", "whatsapp" (optional for backwards compatibility)
    phoneNumber: v.optional(v.string()), // Phone number (for SMS/LoopMessage/WhatsApp)
    telegramId: v.optional(v.number()), // Telegram ID (for Telegram)
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
        slug: v.string(), // Exercise slug matching the exercises table (e.g., "pushups", "squats", "incline-bench-press")
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

  // OTP rate limiting and security
  otpAttempts: defineTable({
    phoneNumber: v.string(), // Phone number for rate limiting
    userId: v.optional(v.string()), // Associated user if authenticated
    attemptType: v.union(v.literal("send"), v.literal("verify")), // Type of attempt
    timestamp: v.number(), // When the attempt occurred
    success: v.boolean(), // Whether the attempt was successful
    ipAddress: v.optional(v.string()), // Optional IP tracking for additional security
  })
    .index("by_phone_and_type", ["phoneNumber", "attemptType"])
    .index("by_phone_and_timestamp", ["phoneNumber", "timestamp"])
    .index("by_user_and_type", ["userId", "attemptType"]),

  exercises: defineTable({
    // Core fields
    slug: v.string(),
    name: v.string(),
    sourceUrl: v.string(),

    // Media
    media: v.object({
      primary_gif: v.optional(v.string()),
      primary_video: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      banner_image: v.optional(v.string()),
      additional_media: v.array(
        v.object({
          type: v.string(),
          url: v.string(),
          description: v.optional(v.string()),
        })
      ),
    }),

    // Muscle groups
    muscleGroups: v.object({
      primary: v.array(
        v.object({
          name: v.string(),
          icon_url: v.optional(v.string()),
        })
      ),
      secondary: v.array(
        v.object({
          name: v.string(),
          icon_url: v.optional(v.string()),
        })
      ),
    }),

    // Equipment
    equipment: v.object({
      primary: v.optional(
        v.object({
          name: v.string(),
          type: v.string(),
          image_url: v.optional(v.string()),
        })
      ),
      additional: v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          image_url: v.optional(v.string()),
        })
      ),
    }),

    // Metadata
    metadata: v.object({
      difficulty: v.optional(v.string()),
      exercise_type: v.optional(v.string()),
      log_type: v.optional(v.string()),
      force: v.optional(v.string()),
      mechanic: v.optional(v.string()),
      category: v.optional(v.string()),
    }),

    // Instructions
    instructions: v.object({
      main: v.optional(v.string()),
      steps: v.array(v.string()),
      tips: v.array(v.string()),
      warnings: v.array(v.string()),
    }),

    // Tags for searchability
    tags: v.array(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),

    // Status
    status: v.optional(
      v.union(v.literal("active"), v.literal("draft"), v.literal("archived"))
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_name", ["name"])
    .index("by_difficulty", ["metadata.difficulty"])
    .index("by_category", ["metadata.category"])
    .searchIndex("search_exercises", {
      searchField: "name",
      filterFields: ["metadata.difficulty", "metadata.category", "tags"],
    }),

  // Track scraping progress
  scrapingJobs: defineTable({
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    totalUrls: v.number(),
    processedUrls: v.number(),
    successfulScrapes: v.number(),
    failedScrapes: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errors: v.array(v.string()),
  }),
});
