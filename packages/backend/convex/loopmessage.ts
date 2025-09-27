import { createThread, listUIMessages } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { jymAgent } from "./agents";

/**
 * Process incoming LoopMessage webhook data
 */
export const processIncomingMessage = internalMutation({
  args: {
    webhookData: v.any(), // LoopMessage webhook payload
  },
  returns: v.object({
    shouldRespond: v.boolean(),
    typing: v.optional(v.number()),
    read: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const { webhookData } = args;

    console.log("Processing LoopMessage webhook:", webhookData);

    // Extract fields from actual LoopMessage webhook format
    const alertType = webhookData.alert_type;
    const senderPhone = webhookData.recipient; // The phone number that sent the message
    const messageText = webhookData.text;
    const messageId = webhookData.message_id;
    const webhookId = webhookData.webhook_id;
    const messageType = webhookData.message_type;

    // Only process inbound messages for now
    if (alertType !== "message_inbound") {
      console.log(`Ignoring webhook with alert_type: ${alertType}`);
      return {
        shouldRespond: false,
      };
    }

    if (!(senderPhone && messageText)) {
      console.error("Invalid webhook data: missing recipient or text");
      return {
        shouldRespond: false,
      };
    }

    console.log(
      `Processing ${messageType} message from ${senderPhone}: ${messageText}`
    );
    console.log(`Message ID: ${messageId}, Webhook ID: ${webhookId}`);

    // Find or create user profile for LoopMessage user
    let userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), senderPhone)) // Use phone as user ID for LoopMessage users
      .first();

    if (!userProfile) {
      console.log(`Creating new LoopMessage user profile for ${senderPhone}`);

      // Create new user profile for LoopMessage
      const profileId = await ctx.db.insert("userProfiles", {
        userId: senderPhone, // Use phone number as simple user ID
        platform: "loopmessage",
        onboardingComplete: false,
        fitnessLevel: "",
        goals: "",
        equipment: "",
        injuries: "",
      });
      userProfile = await ctx.db.get(profileId);
    }

    if (!userProfile) {
      console.error("Failed to create or retrieve user profile");
      return {
        shouldRespond: false,
      };
    }

    // Schedule response generation
    await ctx.scheduler.runAfter(0, internal.loopmessage.generateResponse, {
      userId: senderPhone, // Use phone number as simple user ID
      phoneNumber: senderPhone,
      messageText,
      messageId,
      webhookId,
    });

    // Return response to show typing indicator and mark as read
    return {
      shouldRespond: true,
      typing: 3, // Show typing for 3 seconds
      read: true, // Mark message as read
    };
  },
});

/**
 * Generate response using Jym agent with thread context
 */
export const generateResponse = internalAction({
  args: {
    userId: v.string(), // Phone number as simple user ID
    phoneNumber: v.string(),
    messageText: v.string(),
    messageId: v.string(),
    webhookId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, phoneNumber, messageText, messageId, webhookId } = args;

    try {
      // For LoopMessage users, userId is the phone number
      const actualUserId = userId; // Keep it simple

      // Find existing thread for this user or create a new one
      const existingThreads = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
          userId: actualUserId,
          paginationOpts: { numItems: 1, cursor: null },
        }
      );

      let threadId: string;

      if (existingThreads.page.length > 0) {
        threadId = existingThreads.page[0]._id;
        console.log(`Using existing thread: ${threadId}`);
      } else {
        // Create new thread
        threadId = await createThread(ctx, components.agent, {
          userId: actualUserId,
          title: `Chat with ${phoneNumber}`,
          summary: `Fitness coaching conversation with ${phoneNumber}`,
        });
        console.log(`Created new thread: ${threadId}`);
      }

      // Generate response using Jym agent
      const result = await jymAgent.generateText(
        ctx,
        { threadId },
        {
          prompt: messageText,
        }
      );

      if (!result.text) {
        console.error("No response text generated");
        return null;
      }

      console.log(
        `Generated response for message ${messageId}: ${result.text}`
      );

      // Send response back via LoopMessage
      await ctx.runAction(internal.loopmessage.sendMessage, {
        phoneNumber,
        message: result.text,
        originalMessageId: messageId,
        originalWebhookId: webhookId,
      });
    } catch (error) {
      console.error("Error generating response:", error);

      // Send fallback message
      await ctx.runAction(internal.loopmessage.sendMessage, {
        phoneNumber,
        message: "Sorry, I encountered an issue. Please try again in a moment.",
        originalMessageId: messageId,
        originalWebhookId: webhookId,
      });
    }

    return null;
  },
});

/**
 * Send message via LoopMessage API
 */
export const sendMessage = internalAction({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
    originalMessageId: v.optional(v.string()),
    originalWebhookId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const { phoneNumber, message, originalMessageId } = args;

    try {
      // Get LoopMessage credentials from environment variables
      const authKey = process.env.LOOPMESSAGE_AUTH_KEY;
      const secretKey = process.env.LOOPMESSAGE_SECRET_KEY;
      const senderName = process.env.LOOPMESSAGE_SENDER_NAME || "Jym";

      if (!(authKey && secretKey)) {
        console.error("LoopMessage credentials not configured");
        return null;
      }

      const response = await fetch(
        "https://server.loopmessage.com/api/v1/message/send/",
        {
          method: "POST",
          headers: {
            Authorization: authKey,
            "Loop-Secret-Key": secretKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: phoneNumber,
            text: message,
            sender_name: senderName,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `LoopMessage API error: ${response.status} - ${errorText}`
        );
        return null;
      }

      const result = await response.json();
      console.log(
        `Message sent successfully to ${phoneNumber} (reply to ${originalMessageId}):`,
        result
      );
    } catch (error) {
      console.error("Error sending message via LoopMessage:", error);
    }

    return null;
  },
});

/**
 * Handle different LoopMessage webhook alert types
 */
export const handleWebhookAlertType = internalAction({
  args: {
    webhookData: v.any(),
  },
  returns: v.null(),
  handler: (_ctx, args) => {
    const { webhookData } = args;
    const alertType = webhookData.alert_type;
    const messageId = webhookData.message_id;
    const recipient = webhookData.recipient;

    switch (alertType) {
      case "message_sent":
        console.log(
          `Message ${messageId} sent successfully to ${recipient}. Success: ${webhookData.success}`
        );
        break;

      case "message_failed":
        console.error(
          `Message ${messageId} failed to send to ${recipient}. Error code: ${webhookData.error_code}`
        );
        break;

      case "message_reaction":
        console.log(
          `Received reaction "${webhookData.reaction}" from ${recipient} on message ${messageId}`
        );
        break;

      case "conversation_inited":
        console.log(`New conversation initiated by ${recipient}`);
        break;

      case "message_timeout":
        console.log(
          `Message ${messageId} timed out for ${recipient}. Error code: ${webhookData.error_code}`
        );
        break;

      default:
        console.log(`Unhandled alert type: ${alertType}`);
    }

    return null;
  },
});

/**
 * Get conversation history for a user (useful for debugging)
 */
export const getUserConversation = internalAction({
  args: {
    userId: v.string(), // Phone number as user ID for LoopMessage users
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const { userId, limit = 20 } = args;

    try {
      // Get user's threads
      const threads = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
          userId,
          paginationOpts: { numItems: 1, cursor: null },
        }
      );

      if (threads.page.length === 0) {
        return [];
      }

      const threadId = threads.page[0]._id;

      // Get messages from the thread
      const messages = await listUIMessages(ctx, components.agent, {
        threadId,
        paginationOpts: { numItems: limit, cursor: null },
      });

      return messages.page;
    } catch (error) {
      console.error("Error getting user conversation:", error);
      return [];
    }
  },
});
