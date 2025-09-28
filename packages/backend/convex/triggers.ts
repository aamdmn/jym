import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { createJymAgent, createOnboardingAgent } from "./agents";

/**
 * Create a new trigger (scheduled reminder) for a user
 * This is called by the agent's createTriggerTool
 */
export const createTrigger = internalMutation({
  args: {
    userId: v.string(),
    triggerMessage: v.string(),
    runAt: v.number(), // Timestamp in milliseconds
    phoneNumber: v.string(),
    threadId: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        type: v.optional(v.string()), // e.g., "workout_reminder", "check_in"
        context: v.optional(v.string()), // Additional context for the trigger
      })
    ),
  },
  returns: v.object({
    triggerId: v.id("triggers"),
    scheduledFunctionId: v.id("_scheduled_functions"),
  }),
  handler: async (ctx, args) => {
    const { userId, triggerMessage, runAt, phoneNumber, threadId, metadata } =
      args;

    // Create a trigger record in the database
    const triggerId = await ctx.db.insert("triggers", {
      userId,
      phoneNumber,
      triggerMessage,
      scheduledTime: runAt,
      threadId,
      metadata,
      status: "pending",
      createdAt: Date.now(),
    });

    // Schedule the internal action to run at the specified time
    const scheduledFunctionId = await ctx.scheduler.runAt(
      runAt,
      internal.triggers.executeTrigger,
      {
        triggerId,
      }
    );

    // Update the trigger with the scheduled function ID
    await ctx.db.patch(triggerId, {
      scheduledFunctionId,
    });

    console.log(
      `Created trigger ${triggerId} for user ${userId} to run at ${new Date(
        runAt
      ).toISOString()}`
    );

    return {
      triggerId,
      scheduledFunctionId,
    };
  },
});

/**
 * Execute a trigger - this is called by the scheduler
 * It will invoke the agent with the trigger message
 */
export const executeTrigger = internalAction({
  args: {
    triggerId: v.id("triggers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { triggerId } = args;

    try {
      // Get the trigger details
      const trigger: Doc<"triggers"> | null = await ctx.runQuery(
        internal.triggers.getTrigger,
        { triggerId }
      );

      if (!trigger) {
        console.error(`Trigger ${triggerId} not found`);
        return null;
      }

      if (trigger.status !== "pending") {
        console.log(
          `Trigger ${triggerId} already processed with status: ${trigger.status}`
        );
        return null;
      }

      // Mark trigger as executing
      await ctx.runMutation(internal.triggers.updateTriggerStatus, {
        triggerId,
        status: "executing",
      });

      console.log(
        `Executing trigger ${triggerId} for user ${trigger.userId}: ${trigger.triggerMessage}`
      );

      // Get or create thread for the user
      let threadId = trigger.threadId;
      if (!threadId) {
        // Get existing threads for the user
        const existingThreads = await ctx.runQuery(
          components.agent.threads.listThreadsByUserId,
          {
            userId: trigger.userId,
            paginationOpts: {
              numItems: 1,
              cursor: null,
            },
          }
        );

        if (existingThreads.page.length > 0) {
          threadId = existingThreads.page[0]._id;
        } else {
          // Create new thread if none exists
          threadId = await createThread(ctx, components.agent, {
            userId: trigger.userId,
            title: `Chat with ${trigger.phoneNumber}`,
            summary: "Fitness coaching conversation",
          });
        }
      }

      // Check user's onboarding status to determine which agent to use
      const userProfile = await ctx.runQuery(api.users.getUserOnboardingInfo, {
        userId: trigger.userId,
      });

      // Create appropriate agent based on onboarding status
      const agent = userProfile?.onboardingComplete
        ? createJymAgent(ctx)
        : createOnboardingAgent(ctx);

      const agentName = userProfile?.onboardingComplete
        ? "Jym"
        : "Onboarding Jym";

      console.log(
        `Using ${agentName} for trigger ${triggerId} (user: ${trigger.userId})`
      );

      // Prepare the trigger context message
      const triggerContext = trigger.metadata?.type
        ? `[TRIGGER: ${trigger.metadata.type}] `
        : "[SCHEDULED TRIGGER] ";

      const fullMessage = `${triggerContext}${trigger.triggerMessage}${
        trigger.metadata?.context ? ` Context: ${trigger.metadata.context}` : ""
      }`;

      // Generate response using the agent
      const result = await agent.generateText(
        ctx,
        { threadId, userId: trigger.userId },
        {
          prompt: fullMessage,
        }
      );

      if (!result.text) {
        console.error(`No response generated for trigger ${triggerId}`);
        await ctx.runMutation(internal.triggers.updateTriggerStatus, {
          triggerId,
          status: "failed",
        });
        return null;
      }

      console.log(
        `Generated response for trigger ${triggerId}: ${result.text}`
      );

      // Send the message to the user via LoopMessage
      await ctx.runAction(internal.loopmessage.sendSplitMessages, {
        phoneNumber: trigger.phoneNumber,
        responseText: result.text,
        // No originalMessageId since this is a proactive message
      });

      // Mark trigger as completed
      await ctx.runMutation(internal.triggers.updateTriggerStatus, {
        triggerId,
        status: "completed",
        completedAt: Date.now(),
      });

      console.log(`Successfully executed trigger ${triggerId}`);
    } catch (error) {
      console.error(`Error executing trigger ${triggerId}:`, error);

      // Mark trigger as failed
      await ctx.runMutation(internal.triggers.updateTriggerStatus, {
        triggerId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return null;
  },
});

/**
 * Get a trigger by ID
 */
export const getTrigger = internalQuery({
  args: {
    triggerId: v.id("triggers"),
  },
  returns: v.union(
    v.object({
      _id: v.id("triggers"),
      _creationTime: v.number(),
      userId: v.string(),
      phoneNumber: v.string(),
      triggerMessage: v.string(),
      scheduledTime: v.number(),
      threadId: v.optional(v.string()),
      metadata: v.optional(
        v.object({
          type: v.optional(v.string()),
          context: v.optional(v.string()),
        })
      ),
      status: v.union(
        v.literal("pending"),
        v.literal("executing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      ),
      scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      error: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.triggerId);
  },
});

/**
 * Update trigger status
 */
export const updateTriggerStatus = internalMutation({
  args: {
    triggerId: v.id("triggers"),
    status: v.union(
      v.literal("pending"),
      v.literal("executing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { triggerId, status, completedAt, error } = args;

    const updateData: Partial<Doc<"triggers">> = { status };
    if (completedAt !== undefined) {
      updateData.completedAt = completedAt;
    }
    if (error !== undefined) {
      updateData.error = error;
    }

    await ctx.db.patch(triggerId, updateData);
    return null;
  },
});

/**
 * Get user's triggers (for management/viewing purposes)
 */
export const getUserTriggers = query({
  args: {
    userId: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("executing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("triggers"),
      _creationTime: v.number(),
      triggerMessage: v.string(),
      scheduledTime: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("executing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled")
      ),
      metadata: v.optional(
        v.object({
          type: v.optional(v.string()),
          context: v.optional(v.string()),
        })
      ),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const { userId, status, limit = 50 } = args;

    let query = ctx.db
      .query("triggers")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    const triggers = await query.order("desc").take(limit);

    return triggers.map((trigger) => ({
      _id: trigger._id,
      _creationTime: trigger._creationTime,
      triggerMessage: trigger.triggerMessage,
      scheduledTime: trigger.scheduledTime,
      status: trigger.status,
      metadata: trigger.metadata,
      createdAt: trigger.createdAt,
      completedAt: trigger.completedAt,
    }));
  },
});

/**
 * Cancel a pending trigger
 */
export const cancelTrigger = mutation({
  args: {
    triggerId: v.id("triggers"),
    userId: v.string(), // For authorization
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { triggerId, userId } = args;

    const trigger = await ctx.db.get(triggerId);

    if (!trigger) {
      return {
        success: false,
        message: "Trigger not found",
      };
    }

    if (trigger.userId !== userId) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    if (trigger.status !== "pending") {
      return {
        success: false,
        message: `Cannot cancel trigger with status: ${trigger.status}`,
      };
    }

    // Cancel the scheduled function if it exists
    if (trigger.scheduledFunctionId) {
      await ctx.scheduler.cancel(trigger.scheduledFunctionId);
    }

    // Update trigger status
    await ctx.db.patch(triggerId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return {
      success: true,
      message: "Trigger cancelled successfully",
    };
  },
});
