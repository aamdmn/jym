import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

/**
 * Test function to create a trigger manually
 * This simulates what the agent would do when using the createTrigger tool
 */
export const testCreateTrigger = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
    delayInSeconds: v.number(), // How many seconds from now
    message: v.string(), // What the trigger is about
  },
  returns: v.object({
    success: v.boolean(),
    triggerId: v.optional(v.id("triggers")),
    scheduledTime: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const { userId, phoneNumber, delayInSeconds, message } = args;

      // Calculate the run time
      const runAt = Date.now() + delayInSeconds * 1000;

      // Create the trigger
      const result = await ctx.runMutation(internal.triggers.createTrigger, {
        userId,
        phoneNumber,
        triggerMessage: message,
        runAt,
        metadata: {
          type: "test_trigger",
          context: `Test trigger created with ${delayInSeconds} second delay`,
        },
      });

      console.log(
        `Test trigger created: ${result.triggerId} scheduled for ${new Date(runAt).toISOString()}`
      );

      return {
        success: true,
        triggerId: result.triggerId,
        scheduledTime: new Date(runAt).toISOString(),
      };
    } catch (error) {
      console.error("Error creating test trigger:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Test immediate trigger - fires in 5 seconds
 */
export const testImmediateTrigger = mutation({
  args: {
    userId: v.string(),
    phoneNumber: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    triggerId: v.optional(v.id("triggers")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(internal.triggers.createTrigger, {
      userId: args.userId,
      phoneNumber: args.phoneNumber,
      triggerMessage:
        "Test immediate trigger - should fire in 5 seconds to check if system is working",
      runAt: Date.now() + 5000, // 5 seconds from now
      metadata: {
        type: "immediate_test",
        context: "Testing trigger system",
      },
    });

    return {
      success: true,
      triggerId: result.triggerId,
      message: "Trigger created! Check your messages in 5 seconds.",
    };
  },
});

/**
 * Get the status of recent triggers for testing
 */
export const getRecentTriggers = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("triggers"),
      triggerMessage: v.string(),
      scheduledTime: v.string(),
      status: v.string(),
      createdAt: v.string(),
      completedAt: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const triggers = await ctx.db
      .query("triggers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return triggers.map((trigger) => ({
      _id: trigger._id,
      triggerMessage: trigger.triggerMessage,
      scheduledTime: new Date(trigger.scheduledTime).toISOString(),
      status: trigger.status,
      createdAt: new Date(trigger.createdAt).toISOString(),
      completedAt: trigger.completedAt
        ? new Date(trigger.completedAt).toISOString()
        : undefined,
    }));
  },
});

/**
 * Cancel all pending triggers for a user (useful for cleanup during testing)
 */
export const cancelAllPendingTriggers = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    cancelled: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const pendingTriggers = await ctx.db
      .query("triggers")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .collect();

    let cancelledCount = 0;
    for (const trigger of pendingTriggers) {
      if (trigger.scheduledFunctionId) {
        await ctx.scheduler.cancel(trigger.scheduledFunctionId);
      }
      await ctx.db.patch(trigger._id, {
        status: "cancelled",
        completedAt: Date.now(),
      });
      cancelledCount++;
    }

    return {
      cancelled: cancelledCount,
      message: `Cancelled ${cancelledCount} pending triggers`,
    };
  },
});

// Example usage from the dashboard or client:
//
// 1. Create a test trigger that fires in 30 seconds:
// ```
// await convex.mutation(api.test_triggers.testCreateTrigger, {
//   userId: "user123",
//   phoneNumber: "+1234567890",
//   delayInSeconds: 30,
//   message: "User said they'd start their workout - check if they started"
// });
// ```
//
// 2. Create an immediate test (5 seconds):
// ```
// await convex.mutation(api.test_triggers.testImmediateTrigger, {
//   userId: "user123",
//   phoneNumber: "+1234567890"
// });
// ```
//
// 3. Check trigger status:
// ```
// await convex.query(api.test_triggers.getRecentTriggers, {
//   userId: "user123"
// });
// ```
//
// 4. Clean up all pending triggers:
// ```
// await convex.mutation(api.test_triggers.cancelAllPendingTriggers, {
//   userId: "user123"
// });
// ```
