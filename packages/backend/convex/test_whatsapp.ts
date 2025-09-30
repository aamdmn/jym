/**
 * WhatsApp Integration Test Utilities
 *
 * These functions help test the WhatsApp integration without needing
 * to send actual messages from WhatsApp.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

/**
 * Test the webhook processing with a sample incoming message
 * Run with: npx convex run test_whatsapp:testIncomingMessage --phoneNumber "+1234567890" --message "Hello"
 */
export const testIncomingMessage = internalAction({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const webhookData = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "123456789",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15555555555",
                  phone_number_id: "PHONE_NUMBER_ID",
                },
                contacts: [
                  {
                    profile: {
                      name: "Test User",
                    },
                    wa_id: args.phoneNumber,
                  },
                ],
                messages: [
                  {
                    from: args.phoneNumber,
                    id: `test_${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: {
                      body: args.message,
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    console.log("Testing incoming message with webhook data:", webhookData);

    const result = await ctx.runMutation(
      internal.whatsapp.processIncomingMessage,
      {
        webhookData,
      }
    );

    console.log("Processing result:", result);

    return result;
  },
});

/**
 * Test sending a message directly
 * Run with: npx convex run test_whatsapp:testSendMessage --phoneNumber "+1234567890" --message "Hello from test"
 */
export const testSendMessage = internalAction({
  args: {
    phoneNumber: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`Testing send message to ${args.phoneNumber}: ${args.message}`);

    await ctx.runAction(internal.whatsapp.sendMessage, {
      phoneNumber: args.phoneNumber,
      message: args.message,
    });

    console.log("Message sent successfully");

    return null;
  },
});

/**
 * Test the split messages functionality
 * Run with: npx convex run test_whatsapp:testSplitMessages --phoneNumber "+1234567890"
 */
export const testSplitMessages = internalAction({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const testResponse = `Hello! Welcome to Jym 💪
Let me help you get started with your fitness journey.
<multiline>
Here's what I can do:
- Create personalized workout plans
- Track your progress
- Adjust workouts based on your feedback
- Motivate you to stay consistent
</multiline>
Ready to get started?`;

    console.log(`Testing split messages to ${args.phoneNumber}`);

    await ctx.runAction(internal.whatsapp.sendSplitMessages, {
      phoneNumber: args.phoneNumber,
      responseText: testResponse,
    });

    console.log("Split messages sent successfully");

    return null;
  },
});

/**
 * Check environment variables configuration
 * Run with: npx convex run test_whatsapp:checkEnvironment
 */
export const checkEnvironment = internalAction({
  args: {},
  returns: v.object({
    hasAccessToken: v.boolean(),
    hasPhoneNumberId: v.boolean(),
    hasVerifyToken: v.boolean(),
    apiVersion: v.string(),
  }),
  handler: async (_ctx, _args) => {
    const hasAccessToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
    const hasPhoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID);
    const hasVerifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    console.log("Environment check:");
    console.log(
      `  WHATSAPP_ACCESS_TOKEN: ${hasAccessToken ? "✓ Set" : "✗ Missing"}`
    );
    console.log(
      `  WHATSAPP_PHONE_NUMBER_ID: ${hasPhoneNumberId ? "✓ Set" : "✗ Missing"}`
    );
    console.log(
      `  WHATSAPP_VERIFY_TOKEN: ${hasVerifyToken ? "✓ Set" : "✗ Missing"}`
    );
    console.log(`  WHATSAPP_API_VERSION: ${apiVersion}`);

    if (hasAccessToken && hasPhoneNumberId && hasVerifyToken) {
      console.log("\n✓ All required environment variables are set!");
    } else {
      console.log(
        "\n⚠️  Warning: Some required environment variables are missing!"
      );
      console.log("   Please set them using:");
      console.log('   npx convex env set WHATSAPP_ACCESS_TOKEN "your-token"');
      console.log(
        '   npx convex env set WHATSAPP_PHONE_NUMBER_ID "your-phone-id"'
      );
      console.log(
        '   npx convex env set WHATSAPP_VERIFY_TOKEN "your-verify-token"'
      );
    }

    return {
      hasAccessToken,
      hasPhoneNumberId,
      hasVerifyToken,
      apiVersion,
    };
  },
});

/**
 * Get user's conversation from WhatsApp
 * Run with: npx convex run test_whatsapp:testGetConversation --userId "user_id"
 */
export const testGetConversation = internalAction({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    console.log(`Fetching conversation for user: ${args.userId}`);

    const messages = await ctx.runAction(
      internal.whatsapp.getUserConversation,
      {
        userId: args.userId,
        limit: args.limit || 20,
      }
    );

    console.log(`Found ${messages.length} messages`);

    for (const message of messages) {
      console.log(
        `  - ${message.role}: ${message.content?.substring(0, 50)}...`
      );
    }

    return messages;
  },
});

/**
 * Test the webhook verification endpoint
 * This simulates what Meta sends during webhook verification
 */
export const simulateWebhookVerification = internalMutation({
  args: {
    mode: v.string(),
    token: v.string(),
    challenge: v.string(),
  },
  returns: v.object({
    expectedMode: v.string(),
    expectedToken: v.string(),
    shouldSucceed: v.boolean(),
    instructions: v.string(),
  }),
  handler: async (_ctx, args) => {
    const verifyToken =
      process.env.WHATSAPP_VERIFY_TOKEN || "jym-whatsapp-verify-token";
    const shouldSucceed =
      args.mode === "subscribe" && args.token === verifyToken;

    console.log("Webhook verification simulation:");
    console.log(`  Mode: ${args.mode} (expected: subscribe)`);
    console.log(`  Token: ${args.token} (expected: ${verifyToken})`);
    console.log(`  Challenge: ${args.challenge}`);
    console.log(`  Would succeed: ${shouldSucceed ? "✓ Yes" : "✗ No"}`);

    const instructions = shouldSucceed
      ? "✓ Webhook verification would succeed! You can proceed with Meta configuration."
      : "✗ Verification would fail. Make sure your WHATSAPP_VERIFY_TOKEN matches the token in Meta Developer Console.";

    console.log(`\n${instructions}`);

    return {
      expectedMode: "subscribe",
      expectedToken: verifyToken,
      shouldSucceed,
      instructions,
    };
  },
});
