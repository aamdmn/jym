import { stepCountIs } from "ai";
import { Bot, type Context } from "grammy";
import type { User } from "grammy/types";
import { fitnessCoach } from "./lib/agent";
import { OnboardingFlow } from "./lib/onboarding";
import { getOrCreateUser } from "./lib/session";
import { extractAgentMessage } from "./lib/utils";

// Check environment variables
if (!process.env.TELEGRAM_BOT_API_KEY) {
  throw new Error("TELEGRAM_BOT_API_KEY is not set");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const bot = new Bot(process.env.TELEGRAM_BOT_API_KEY);

// Store minimal conversation context with response IDs for persistence
const conversations = new Map<
  number,
  { messages: Array<any>; messageCount: number; lastResponseId?: string }
>();

// Track onboarding flows
const onboardingFlows = new Map<number, OnboardingFlow>();

// Track users who just completed initial challenge (need onboarding)
const pendingOnboarding = new Set<number>();

// Helper to send messages naturally with typing
async function sendNaturalMessage(ctx: Context, text: string) {
  // Split by newlines to send as separate messages
  const messages = text.split("\n\n").filter((msg) => msg.trim());

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]?.trim();
    if (!message) continue;

    // Show typing
    await ctx.replyWithChatAction("typing");

    // Calculate natural typing delay (30-50ms per character, capped)
    const typingDelay = Math.min(Math.max(message.length * 40, 500), 2000);
    await new Promise((resolve) => setTimeout(resolve, typingDelay));

    // Send message
    await ctx.reply(message);

    // Small pause between messages
    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

// Start command - immediately give them a challenge
bot.command("start", async (ctx) => {
  const { id, is_bot, username, first_name, last_name } = ctx.from as User;

  if (!id || is_bot) {
    return;
  }

  // Create user in database
  const user = await getOrCreateUser({
    telegramId: id,
    username,
    firstName: first_name,
    lastName: last_name,
  });

  // Initialize conversation
  conversations.set(id, {
    messages: [],
    messageCount: 0,
    lastResponseId: undefined,
  });

  // Check if user already completed onboarding
  if (user?.onboardingComplete) {
    await sendNaturalMessage(
      ctx,
      `yo ${first_name?.toLowerCase()}\n\nwelcome back! ready for another workout?`
    );
    return;
  }

  try {
    // Generate initial challenge immediately
    const result = await fitnessCoach.generate({
      messages: [
        {
          role: "user",
          content: `new user ${first_name} just started. give them an easy quick challenge to get them moving right away`,
        },
      ],
      // Let the agent decide when to use tools naturally
      toolChoice: "auto",
      // Allow 3 steps: tool call, tool result, text response
      stopWhen: stepCountIs(3),
    });

    // Log what happened for debugging
    console.log(
      `[${first_name}] Tool calls:`,
      result.toolCalls.map((tc) => tc.toolName)
    );
    console.log(`[${first_name}] Steps taken:`, result.steps.length);

    // Handle response - prioritize text, fall back to tool results
    let message = result.text || "";
    if (!message && result.toolResults?.length) {
      message = extractAgentMessage(result);
    }
    if (!message) {
      message = "let's start simple - give me 10 pushups";
    }

    await sendNaturalMessage(
      ctx,
      `yo ${first_name?.toLowerCase()}\n\n${message}`
    );

    // Add to pending onboarding after initial challenge
    pendingOnboarding.add(id);
    console.log(`🔄 Added user ${id} to pending onboarding`);

    // Store the interaction
    const conv = conversations.get(id);
    if (conv) {
      conv.messages = result.response.messages;
      conv.messageCount++;
    }
  } catch (error) {
    console.error("Error generating initial challenge:", error);
    await sendNaturalMessage(
      ctx,
      "yo! ready to move?\n\nlet's start simple - give me 10 pushups"
    );
    // Still add to pending onboarding even if challenge failed
    pendingOnboarding.add(id);
  }
});

// Handle all text messages
bot.on("message:text", async (ctx) => {
  const { id } = ctx.from as User;
  const userMessage = ctx.message.text;

  if (!id || userMessage.startsWith("/")) {
    return;
  }

  try {
    // Check if user needs to start onboarding
    if (pendingOnboarding.has(id)) {
      pendingOnboarding.delete(id);

      // Start onboarding flow
      const onboardingFlow = new OnboardingFlow(id);
      onboardingFlows.set(id, onboardingFlow);

      console.log(`🎯 Starting onboarding for user ${id}`);

      // Start with first onboarding question (includes acknowledgment)
      const firstQuestion = await onboardingFlow.getNextQuestion();
      await sendNaturalMessage(ctx, firstQuestion.text);
      return;
    }

    // Check if user is in onboarding flow
    const onboardingFlow = onboardingFlows.get(id);
    if (onboardingFlow && !onboardingFlow.isComplete()) {
      console.log(
        `📝 Processing onboarding response from user ${id}: "${userMessage}"`
      );

      // Process the user's response (includes acknowledgment + next question)
      const { acknowledgment, isComplete } =
        await onboardingFlow.processResponse(userMessage);

      // Send the combined response
      await sendNaturalMessage(ctx, acknowledgment);

      if (isComplete) {
        // Onboarding complete - send completion message
        onboardingFlows.delete(id);
        const completionMessage = await onboardingFlow.getNextQuestion();
        await sendNaturalMessage(ctx, completionMessage.text);
        console.log(`✅ Completed onboarding for user ${id}`);
      }
      return;
    }

    // Handle normal conversation (user completed onboarding)
    // Get or create conversation
    let conv = conversations.get(id);
    if (!conv) {
      conv = { messages: [], messageCount: 0, lastResponseId: undefined };
      conversations.set(id, conv);
    }

    // Build messages for the agent
    const messages = [
      ...conv.messages,
      { role: "user" as const, content: userMessage },
    ];

    // Keep conversation history reasonable
    if (messages.length > 20) {
      messages.splice(0, messages.length - 20);
    }

    // Generate response with persistence via OpenAI Responses API
    const result = await fitnessCoach.generate({
      messages,
      // Use auto tool choice to let agent decide naturally
      toolChoice: "auto",
      // Allow 3 steps: tool call, tool result, text response
      stopWhen: stepCountIs(3),
      // Use previous response ID for conversation persistence
      ...(conv.lastResponseId && {
        providerOptions: {
          openai: {
            previousResponseId: conv.lastResponseId,
          },
        },
      }),
    });

    // Log for debugging
    console.log(`[User ${id}] Message: "${userMessage}"`);
    console.log(
      `[User ${id}] Tool calls:`,
      result.toolCalls.map((tc) => tc.toolName)
    );
    console.log(`[User ${id}] Steps taken:`, result.steps.length);
    console.log(
      `[User ${id}] Response ID:`,
      result.providerMetadata?.openai?.responseId
    );

    // Handle response - prioritize text, fall back to tool results
    let message = result.text || "";
    if (!message && result.toolResults?.length) {
      message = extractAgentMessage(result);
    }
    if (!message) {
      message = "how you feeling? ready to move?";
    }

    await sendNaturalMessage(ctx, message);

    // Update conversation with new response ID for persistence
    conv.messages = result.response.messages;
    conv.messageCount++;
    conv.lastResponseId = result.providerMetadata?.openai?.responseId;

    // Clean up old conversations periodically
    if (conv.messageCount > 50) {
      conv.messages = conv.messages.slice(-10);
      conv.messageCount = 10;
    }
  } catch (error) {
    console.error("Error in conversation:", error);
    await sendNaturalMessage(
      ctx,
      "my bad, brain freeze\n\nhow you feeling though?"
    );
  }
});

// Quick workout command
bot.command("workout", async (ctx) => {
  const { id } = ctx.from as User;
  if (!id) {
    return;
  }

  try {
    const result = await fitnessCoach.generate({
      messages: [
        {
          role: "user",
          content: "give me a quick workout challenge right now",
        },
      ],
      // Let the agent decide when to use tools
      toolChoice: "auto",
      // Allow 3 steps: tool call, tool result, text response
      stopWhen: stepCountIs(3),
    });

    console.log(
      "[Workout command] Tool calls:",
      result.toolCalls.map((tc) => tc.toolName)
    );

    // Handle response - prioritize text, fall back to tool results
    let message = result.text || "";
    if (!message && result.toolResults?.length) {
      message = extractAgentMessage(result);
    }
    if (!message) {
      message = "alright let's go\n\n20 squats right now";
    }

    await sendNaturalMessage(ctx, message);
  } catch (error) {
    console.error("Error generating workout:", error);
    await sendNaturalMessage(ctx, "alright let's go\n\n20 squats right now");
  }
});

// Reset conversation
bot.command("reset", async (ctx) => {
  const { id } = ctx.from as User;
  if (id) {
    conversations.delete(id);
    await sendNaturalMessage(ctx, "fresh start\n\nwhat's up?");
  }
});

// Help command
bot.command("help", async (ctx) => {
  await sendNaturalMessage(
    ctx,
    "i'm your fitness coach\n\n" +
      "just talk to me normally\n\n" +
      "commands:\n" +
      "/workout - quick challenge\n" +
      "/reset - fresh start\n\n" +
      "now stop reading and start moving"
  );
});

console.log("🏃 fitness coach bot starting...");
console.log("💪 ready to get people moving!");

bot.start();
