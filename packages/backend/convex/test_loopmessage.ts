import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";

/**
 * Test function to simulate a LoopMessage webhook for development
 */
export const testWebhook = action({
  args: {
    phoneNumber: v.string(),
    messageText: v.string(),
    alertType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; response: any }> => {
    // Simulate actual LoopMessage webhook payload format
    const mockWebhookData = {
      alert_type: args.alertType || "message_inbound",
      recipient: args.phoneNumber,
      text: args.messageText,
      message_type: "text",
      message_id: crypto.randomUUID(),
      webhook_id: crypto.randomUUID(),
      api_version: "1.0",
      delivery_type: "imessage",
    };

    console.log("Simulating LoopMessage webhook with data:", mockWebhookData);

    try {
      let result;

      if (mockWebhookData.alert_type === "message_inbound") {
        // Process inbound message
        result = await ctx.runMutation(
          internal.loopmessage.processIncomingMessage,
          {
            webhookData: mockWebhookData,
          }
        );
      } else {
        // Handle other alert types
        await ctx.runAction(internal.loopmessage.handleWebhookAlertType, {
          webhookData: mockWebhookData,
        });
        result = { shouldRespond: false };
      }

      return {
        success: true,
        response: result,
      };
    } catch (error) {
      console.error("Test webhook error:", error);
      return {
        success: false,
        response: { error: error.message },
      };
    }
  },
});

/**
 * Test function to send a message directly via LoopMessage API
 */
export const testSendMessage = action({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.loopmessage.sendMessage, {
      phoneNumber: args.phoneNumber,
      message: args.message,
      originalMessageId: "test-message-id",
      originalWebhookId: "test-webhook-id",
    });
    return null;
  },
});

/**
 * Test different LoopMessage webhook alert types
 */
export const testWebhookAlertTypes = action({
  args: {
    phoneNumber: v.string(),
    alertType: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    alertType: v.string(),
  }),
  handler: async (ctx, args) => {
    const webhookData = {
      alert_type: args.alertType,
      recipient: args.phoneNumber,
      text: "Test message",
      message_id: crypto.randomUUID(),
      webhook_id: crypto.randomUUID(),
      api_version: "1.0",
      success: true, // for message_sent
      error_code: 100, // for message_failed
      reaction: "like", // for message_reaction
    };

    try {
      await ctx.runAction(internal.loopmessage.handleWebhookAlertType, {
        webhookData,
      });

      return {
        success: true,
        alertType: args.alertType,
      };
    } catch (error) {
      console.error(`Error testing ${args.alertType}:`, error);
      return {
        success: false,
        alertType: args.alertType,
      };
    }
  },
});

/**
 * Get user conversation history for debugging
 */
export const getUserMessages = action({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args): Promise<any[]> => {
    // For LoopMessage users, phone number is the user ID
    return await ctx.runAction(internal.loopmessage.getUserConversation, {
      userId: args.phoneNumber, // Use phone number directly as user ID
      limit: 10,
    });
  },
});

/**
 * Helper query to find user profile by phone number (for testing)
 */
export const findUserByPhone = query({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.object({
      userId: v.string(), // Phone number as user ID
      platform: v.string(),
      onboardingComplete: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), args.phoneNumber))
      .first();

    if (!userProfile) {
      return null;
    }

    return {
      userId: userProfile.userId,
      platform: userProfile.platform,
      onboardingComplete: userProfile.onboardingComplete,
    };
  },
});

/**
 * Helper query to get user profile by phone number (for testing)
 */
export const getUserProfile = query({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.object({
      userId: v.string(),
      platform: v.string(),
      onboardingComplete: v.boolean(),
      fitnessLevel: v.string(),
      goals: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), args.phoneNumber)) // Phone number is the user ID
      .first();

    if (!profile) {
      return null;
    }

    return {
      userId: profile.userId,
      platform: profile.platform,
      onboardingComplete: profile.onboardingComplete,
      fitnessLevel: profile.fitnessLevel,
      goals: profile.goals,
    };
  },
});
