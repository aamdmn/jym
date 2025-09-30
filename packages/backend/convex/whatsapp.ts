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

/**
 * Process incoming WhatsApp webhook data
 */
export const processIncomingMessage = internalMutation({
  args: {
    webhookData: v.any(), // WhatsApp webhook payload
  },
  returns: v.object({
    shouldRespond: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { webhookData } = args;

    console.log(
      "Processing WhatsApp webhook:",
      JSON.stringify(webhookData, null, 2)
    );

    // Extract fields from WhatsApp webhook format
    // WhatsApp structure: { object, entry: [{ changes: [{ value: { messages, contacts } }] }] }
    const entry = webhookData.entry?.[0];
    if (!entry) {
      console.log("No entry in webhook data");
      return { shouldRespond: false };
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      console.log("No changes in webhook data");
      return { shouldRespond: false };
    }

    const value = changes.value;
    if (!value) {
      console.log("No value in webhook data");
      return { shouldRespond: false };
    }

    // Check if this is a message event
    const messages = value.messages;
    if (!messages || messages.length === 0) {
      console.log("No messages in webhook data, might be status update");
      return { shouldRespond: false };
    }

    const message = messages[0];
    const messageId = message.id;
    const messageType = message.type;
    const timestamp = message.timestamp;

    // Extract sender phone number from contacts or from field
    const senderPhone = message.from;
    const contacts = value.contacts;
    const senderName = contacts?.[0]?.profile?.name || senderPhone;

    // Only process text messages for now
    if (messageType !== "text") {
      console.log(`Ignoring non-text message type: ${messageType}`);

      // Send unsupported message type response
      await ctx.scheduler.runAfter(0, internal.whatsapp.sendMessage, {
        phoneNumber: senderPhone,
        message: "sorry, i can only read text messages for now! 📱",
      });

      return { shouldRespond: true };
    }

    const messageText = message.text?.body;

    if (!(senderPhone && messageText)) {
      console.error("Invalid webhook data: missing sender phone or text");
      return { shouldRespond: false };
    }

    // Validate phone number format
    const isPhone = phoneNumberSchema.safeParse(senderPhone).success;

    if (!isPhone) {
      console.error(
        `Invalid phone number format: ${senderPhone}. Expected phone number format.`
      );
      return { shouldRespond: false };
    }

    console.log(
      `Processing ${messageType} message from ${senderName} (${senderPhone}): ${messageText}`
    );
    console.log(`Message ID: ${messageId}, Timestamp: ${timestamp}`);

    // Mark message as read immediately for better UX
    await ctx.scheduler.runAfter(0, internal.whatsapp.markMessageAsRead, {
      messageId,
    });

    // Normalize phone number for betterAuth lookup (ensure + prefix)
    const normalizedPhone = senderPhone.startsWith("+")
      ? senderPhone
      : `+${senderPhone}`;

    console.log(
      `Normalized phone: ${senderPhone} -> ${normalizedPhone} for betterAuth lookup`
    );

    // Check if user exists in betterAuth using phone number
    const user = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "phoneNumber", value: normalizedPhone }],
    });

    console.log("Found user:", user);

    if (!user?._id) {
      console.log(
        `User with phone ${senderPhone} not found in betterAuth or missing ID`
      );

      // Send login message for unauthenticated users
      await ctx.scheduler.runAfter(0, internal.whatsapp.sendMessage, {
        phoneNumber: senderPhone,
        message:
          "hello human! 👋 before we start please login:\n\nhttps://jym.coach/login",
      });

      return { shouldRespond: true };
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
        platform: "whatsapp",
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
    await ctx.scheduler.runAfter(0, internal.whatsapp.generateResponse, {
      userId: user._id, // Use the actual betterAuth user ID
      phoneNumber: senderPhone,
      messageText,
      messageId,
      senderName,
    });

    // Return success response
    return { shouldRespond: true };
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
    senderName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, phoneNumber, messageText, messageId, senderName } = args;

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
          title: `WhatsApp chat with ${senderName || phoneNumber}`,
          summary: `Fitness coaching conversation with ${senderName || phoneNumber} via WhatsApp`,
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
      await ctx.runAction(internal.whatsapp.sendSplitMessages, {
        phoneNumber,
        responseText: result.text,
      });
    } catch (error) {
      console.error("Error generating response:", error);

      // Send fallback message
      await ctx.runAction(internal.whatsapp.sendSplitMessages, {
        phoneNumber,
        responseText:
          "sorry, i encountered an issue. please try again in a moment! 😅",
      });
    }

    return null;
  },
});

/**
 * Mark a message as read via WhatsApp Business API
 */
export const markMessageAsRead = internalAction({
  args: {
    messageId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const { messageId } = args;

    try {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

      if (!(accessToken && phoneNumberId)) {
        console.error("WhatsApp credentials not configured");
        return null;
      }

      const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to mark message as read: ${response.status} - ${errorText}`
        );
        return null;
      }

      console.log(`Message ${messageId} marked as read`);
    } catch (error) {
      console.error("Error marking message as read:", error);
    }

    return null;
  },
});

/**
 * Send message via WhatsApp Business API
 */
export const sendMessage = internalAction({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const { phoneNumber, message } = args;

    try {
      // Get WhatsApp credentials from environment variables
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

      if (!(accessToken && phoneNumberId)) {
        console.error("WhatsApp credentials not configured");
        return null;
      }

      // WhatsApp Business API endpoint
      const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNumber,
          type: "text",
          text: {
            preview_url: true, // Enable link previews
            body: message,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`WhatsApp API error: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      console.log(`Message sent successfully to ${phoneNumber}:`, result);
    } catch (error) {
      console.error("Error sending message via WhatsApp:", error);
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { phoneNumber, responseText } = args;

    try {
      // Parse multiline tags and handle mixed content
      const messages = parseResponseIntoMessages(responseText);

      console.log(
        `Sending ${messages.length} split messages to ${phoneNumber}`
      );

      // Send each message with minimal delays for fast response
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        // Add small delay between messages for readability (only after first message)
        // Keep it minimal to reduce latency
        if (i > 0) {
          const minimalDelay = Math.min(300, message.length * 5); // Very short delay, max 300ms
          await new Promise((resolve) => setTimeout(resolve, minimalDelay));
        }

        console.log(
          `Sending message ${i + 1}/${messages.length}: "${message}"`
        );

        // Send the individual message
        await ctx.runAction(internal.whatsapp.sendMessage, {
          phoneNumber,
          message,
        });
      }

      console.log(
        `Successfully sent all ${messages.length} split messages to ${phoneNumber}`
      );
    } catch (error) {
      console.error("Error sending split messages:", error);

      // Fallback: send original response as single message
      await ctx.runAction(internal.whatsapp.sendMessage, {
        phoneNumber,
        message: responseText,
      });
    }

    return null;
  },
});

/**
 * Handle different WhatsApp webhook status updates
 */
export const handleStatusUpdate = internalAction({
  args: {
    webhookData: v.any(),
  },
  returns: v.null(),
  handler: (_ctx, args) => {
    const { webhookData } = args;

    const entry = webhookData.entry?.[0];
    if (!entry) {
      return null;
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      return null;
    }

    const value = changes.value;
    const statuses = value?.statuses;

    if (statuses && statuses.length > 0) {
      const status = statuses[0];
      const messageId = status.id;
      const statusValue = status.status; // sent, delivered, read, failed
      const timestamp = status.timestamp;
      const recipient = status.recipient_id;

      console.log(
        `Message ${messageId} status update: ${statusValue} at ${timestamp} for recipient ${recipient}`
      );

      if (statusValue === "failed") {
        const errors = status.errors;
        console.error("Message failed:", errors);
      }
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
