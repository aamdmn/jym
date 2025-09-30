/** biome-ignore-all lint/suspicious/noConsole: <explanation> */
import { conversations, createConversation } from "@grammyjs/conversations";
import { Bot } from "grammy";
import type { User } from "grammy/types";
import { getOrCreateUser } from "./lib/context-manager";
import {
  fitnessConversation,
  onboardingConversation,
  quickWorkoutConversation,
} from "./lib/conversation-builders";
import type { MyContext } from "./lib/types";

// Environment validation
if (!process.env.TELEGRAM_BOT_API_KEY) {
  throw new Error("TELEGRAM_BOT_API_KEY is not set");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set");
}

// Create bot with conversation flavor
const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_API_KEY);

// Install conversations plugin
bot.use(conversations());

// Register conversation builders
bot.use(createConversation(onboardingConversation, "onboarding"));
bot.use(createConversation(fitnessConversation, "fitness_chat"));
bot.use(createConversation(quickWorkoutConversation, "quick_workout"));

// Helper to send messages naturally with typing
async function sendNaturalMessage(ctx: MyContext, text: string) {
  const messages = text.split("\n\n").filter((msg) => msg.trim());

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]?.trim();
    if (!message) {
      continue;
    }

    await ctx.replyWithChatAction("typing");
    const typingDelay = Math.min(Math.max(message.length * 40, 500), 2000);
    await new Promise((resolve) => setTimeout(resolve, typingDelay));
    await ctx.reply(message);

    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

// Start command - entry point for new users
bot.command("start", async (ctx) => {
  const { id, is_bot, username, first_name, last_name } = ctx.from as User;

  if (!id || is_bot) {
    return;
  }

  try {
    // Create or get user from database
    const user = await getOrCreateUser({
      telegramId: id,
      username,
      firstName: first_name,
      lastName: last_name,
    });

    // Check if user already completed onboarding
    if (user?.onboardingComplete) {
      await sendNaturalMessage(
        ctx,
        `yo ${first_name?.toLowerCase()}\n\nwelcome back! ready for another workout?`
      );

      // Enter fitness chat conversation
      await ctx.conversation.enter("fitness_chat");
      return;
    }

    // New user - start with immediate challenge then onboarding
    await sendNaturalMessage(
      ctx,
      `yo ${first_name?.toLowerCase()}\n\nlet's see what you got - give me 10 pushups right now\n\n(modify on your knees if needed)`
    );

    // Enter onboarding conversation after initial challenge
    await ctx.conversation.enter("onboarding");
  } catch (error) {
    console.error("Error in start command:", error);
    await sendNaturalMessage(
      ctx,
      "yo! ready to move?\n\nlet's start simple - give me 10 pushups"
    );

    // Still enter onboarding even if setup failed
    await ctx.conversation.enter("onboarding");
  }
});

// Quick workout command
bot.command("workout", async (ctx) => {
  try {
    await ctx.conversation.enter("quick_workout");
  } catch (error) {
    console.error("Error in workout command:", error);
    await sendNaturalMessage(ctx, "alright let's go\n\n20 squats right now");
  }
});

// Reset all conversations
bot.command("reset", async (ctx) => {
  const { id } = ctx.from as User;
  if (!id) {
    return;
  }

  try {
    // Exit all active conversations
    const activeConversations = ctx.conversation.active();
    for (const [name] of Object.entries(activeConversations)) {
      await ctx.conversation.exit(name);
    }

    await sendNaturalMessage(ctx, "fresh start\n\nwhat's up?");

    // Enter new fitness chat
    await ctx.conversation.enter("fitness_chat");
  } catch (error) {
    console.error("Error in reset command:", error);
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
      "/reset - fresh start\n" +
      "/status - see active conversations\n\n" +
      "now stop reading and start moving"
  );
});

// Status command to see active conversations
bot.command("status", async (ctx) => {
  const activeConversations = ctx.conversation.active();
  const count = Object.values(activeConversations).reduce(
    (sum, num) => sum + num,
    0
  );

  if (count === 0) {
    await sendNaturalMessage(
      ctx,
      "no active conversations\n\nuse /start to begin"
    );
  } else {
    const conversationList = Object.entries(activeConversations)
      .map(([name, count]) => `${name}: ${count}`)
      .join("\n");

    await sendNaturalMessage(
      ctx,
      `active conversations:\n${conversationList}\n\nuse /reset to start fresh`
    );
  }
});

// Handle regular messages - enter fitness chat if no conversation active
bot.on("message:text", async (ctx) => {
  const { id } = ctx.from as User;
  if (!id || ctx.message.text.startsWith("/")) {
    return;
  }

  try {
    const activeConversations = ctx.conversation.active();
    const hasActiveConversation = Object.values(activeConversations).some(
      (count) => count > 0
    );

    if (!hasActiveConversation) {
      // No active conversation, start fitness chat
      await ctx.conversation.enter("fitness_chat");
    }
    // If there's an active conversation, it will handle the message
  } catch (error) {
    console.error("Error handling text message:", error);
    await sendNaturalMessage(
      ctx,
      "my bad, brain freeze\n\nhow you feeling though?"
    );
  }
});

// Error handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    `Error while handling update ${ctx.update.update_id}:`,
    err.error
  );

  // Try to send a friendly error message
  try {
    if ("reply" in ctx) {
      sendNaturalMessage(
        ctx as MyContext,
        "something went wrong\n\nhow about we try again?"
      );
    }
  } catch (replyError) {
    console.error("Could not send error message:", replyError);
  }
});

console.log("🏃 fitness coach bot starting with conversations...");
console.log("💪 ready to get people moving with persistent context!");

bot.start();
