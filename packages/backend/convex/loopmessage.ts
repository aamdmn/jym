import { createThread, listUIMessages } from "@convex-dev/agent";
import { v } from "convex/values";
import { z } from "zod";
import { api, components, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { createJymAgent, createOnboardingAgent } from "./agents";

// Zod schemas for validation
const phoneNumberSchema = z
  .string()
  .regex(
    /^(\+[1-9]\d{7,15}|[1-9]\d{9,14})$/,
    "Invalid phone number format. Must be a valid phone number."
  );

const emailSchema = z.email("Invalid email format");

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

    // Validate that recipient is a phone number, not an email
    const isEmail = emailSchema.safeParse(senderPhone).success;
    const isPhone = phoneNumberSchema.safeParse(senderPhone).success;

    if (isEmail) {
      console.log(
        `Received message from email address: ${senderPhone}, sending unsupported message`
      );

      // Send message explaining email is not supported
      await ctx.scheduler.runAfter(0, internal.loopmessage.sendMessage, {
        phoneNumber: senderPhone,
        message:
          "oops, we don't support email sending in iMessage (for now). please change it to sending as a phone number to continue our conversation!",
        originalMessageId: messageId,
        originalWebhookId: webhookId,
      });

      return {
        shouldRespond: true,
        typing: 1,
        read: true,
      };
    }

    if (!isPhone) {
      console.error(
        `Invalid recipient format: ${senderPhone}. Expected phone number format.`
      );
      return {
        shouldRespond: false,
      };
    }

    console.log(
      `Processing ${messageType} message from ${senderPhone}: ${messageText}`
    );
    console.log(`Message ID: ${messageId}, Webhook ID: ${webhookId}`);

    // Check if user exists in betterAuth using phone number
    const user = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "phoneNumber", value: senderPhone }],
    });

    console.log("Found user:", user);

    if (!user?._id) {
      console.log(
        `User with phone ${senderPhone} not found in betterAuth or missing ID`
      );

      // Send login message for unauthenticated users
      await ctx.scheduler.runAfter(0, internal.loopmessage.sendMessage, {
        phoneNumber: senderPhone,
        message:
          "hello human! before we start please login:\n\nhttps://jym.coach/login",
        originalMessageId: messageId,
        originalWebhookId: webhookId,
      });

      return {
        shouldRespond: true,
        typing: 2, // Brief typing indicator
        read: true,
      };
    }

    // Find or create userProfile for this betterAuth user
    let userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!userProfile) {
      console.log(`Creating new userProfile for betterAuth user ${user._id}`);

      // Create new user profile
      const profileId = await ctx.db.insert("userProfiles", {
        userId: user._id,
        platform: "loopmessage",
        onboardingComplete: false,
        fitnessLevel: "",
        goals: "",
        equipment: "",
        injuries: "",
        mesuringSystem: "metric", // Default to metric
      });
      userProfile = await ctx.db.get(profileId);
    }

    console.log(
      `Found authenticated user: ${user._id} for phone ${senderPhone}, profile: ${userProfile?._id}`
    );

    // Schedule response generation with the authenticated user ID
    await ctx.scheduler.runAfter(0, internal.loopmessage.generateResponse, {
      userId: user._id, // Use the actual betterAuth user ID
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
    userId: v.string(), // betterAuth user ID
    phoneNumber: v.string(),
    messageText: v.string(),
    messageId: v.string(),
    webhookId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, phoneNumber, messageText, messageId, webhookId } = args;

    try {
      // userId is now the betterAuth user ID
      const actualUserId = userId;

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

      // Check user's onboarding status to determine which agent to use
      const userProfile = await ctx.runQuery(api.users.getUserOnboardingInfo, {
        userId: actualUserId,
      });

      // Create appropriate agent based on onboarding status
      const agent = userProfile?.onboardingComplete
        ? createJymAgent(ctx)
        : createOnboardingAgent(ctx);
      const agentName = userProfile?.onboardingComplete
        ? "Jym"
        : "Onboarding Jym";

      console.log(
        `Using ${agentName} for user ${actualUserId} (onboarding complete: ${userProfile?.onboardingComplete})`
      );

      // Generate response using the appropriate agent with userId context
      const result = await agent.generateText(
        ctx,
        { threadId, userId: actualUserId },
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

      // Split response into separate messages and send them sequentially
      await ctx.runAction(internal.loopmessage.sendSplitMessages, {
        phoneNumber,
        responseText: result.text,
        originalMessageId: messageId,
        originalWebhookId: webhookId,
      });
    } catch (error) {
      console.error("Error generating response:", error);

      // Send fallback message
      await ctx.runAction(internal.loopmessage.sendSplitMessages, {
        phoneNumber,
        responseText:
          "Sorry, I encountered an issue. Please try again in a moment.",
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
 * Parse response text and handle multiline tags
 */
function parseResponseIntoMessages(responseText: string): string[] {
  const messages: string[] = [];
  let currentIndex = 0;

  while (currentIndex < responseText.length) {
    // Look for multiline opening tag
    const multilineStart = responseText.indexOf("<multiline>", currentIndex);

    if (multilineStart === -1) {
      // No more multiline tags, process remaining text normally
      const remainingText = responseText.substring(currentIndex);
      const remainingMessages = remainingText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      messages.push(...remainingMessages);
      break;
    }

    // Process text before multiline tag
    if (multilineStart > currentIndex) {
      const beforeMultiline = responseText.substring(
        currentIndex,
        multilineStart
      );
      const beforeMessages = beforeMultiline
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      messages.push(...beforeMessages);
    }

    // Find closing multiline tag
    const multilineEnd = responseText.indexOf("</multiline>", multilineStart);
    if (multilineEnd === -1) {
      // Malformed multiline tag, treat rest as normal text
      const remainingText = responseText.substring(multilineStart);
      const remainingMessages = remainingText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      messages.push(...remainingMessages);
      break;
    }

    // Extract multiline content (preserve line breaks within)
    const multilineContentStart = multilineStart + "<multiline>".length;
    const multilineContent = responseText
      .substring(multilineContentStart, multilineEnd)
      .trim();

    if (multilineContent.length > 0) {
      messages.push(multilineContent);
    }

    // Continue after closing tag
    currentIndex = multilineEnd + "</multiline>".length;
  }

  return messages;
}

/**
 * Split agent response into multiple messages and send them with realistic delays
 */
export const sendSplitMessages = internalAction({
  args: {
    phoneNumber: v.string(),
    responseText: v.string(),
    originalMessageId: v.optional(v.string()),
    originalWebhookId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { phoneNumber, responseText, originalMessageId, originalWebhookId } =
      args;

    try {
      // Parse multiline tags and handle mixed content
      const messages = parseResponseIntoMessages(responseText);

      console.log(
        `Sending ${messages.length} split messages to ${phoneNumber}`
      );

      // Send each message with realistic delays
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        // Calculate typing delay based on message length (simulate realistic typing speed)
        // Average typing speed: ~40 WPM = ~200 characters per minute = ~3.3 chars per second
        // Add some randomness and minimum delay
        const typingDelayMs = Math.max(
          800, // Minimum delay of 800ms
          message.length * 50 + Math.random() * 500 // ~50ms per character + random variance
        );

        // Add delay before sending (except for first message)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, typingDelayMs));
        }

        console.log(
          `Sending message ${i + 1}/${messages.length}: "${message}" (after ${i > 0 ? typingDelayMs : 0}ms delay)`
        );

        // Send the individual message
        await ctx.runAction(internal.loopmessage.sendMessage, {
          phoneNumber,
          message,
          originalMessageId: i === 0 ? originalMessageId : undefined, // Only link first message to original
          originalWebhookId: i === 0 ? originalWebhookId : undefined,
        });
      }

      console.log(
        `Successfully sent all ${messages.length} split messages to ${phoneNumber}`
      );
    } catch (error) {
      console.error("Error sending split messages:", error);

      // Fallback: send original response as single message
      await ctx.runAction(internal.loopmessage.sendMessage, {
        phoneNumber,
        message: responseText,
        originalMessageId,
        originalWebhookId,
      });
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
    userId: v.string(), // betterAuth user ID
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
