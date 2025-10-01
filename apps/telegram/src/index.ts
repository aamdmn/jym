/** biome-ignore-all lint/suspicious/noConsole: <explanation> */

import { api } from "@jym/backend/convex/_generated/api";
import { ConvexClient } from "convex/browser";
import { Bot, type Context } from "grammy";

// Environment validation
if (!process.env.TELEGRAM_BOT_API_KEY) {
  throw new Error("TELEGRAM_BOT_API_KEY is not set");
}

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set");
}

// Initialize Convex client
const convex = new ConvexClient(process.env.CONVEX_URL);

// Create bot
const bot = new Bot<Context>(process.env.TELEGRAM_BOT_API_KEY);

// Helper to split messages by multiline tags
function parseMessages(text: string): Array<string> {
  const multilineRegex = /<multiline>([\s\S]*?)<\/multiline>/g;
  const messages: Array<string> = [];
  let lastIndex = 0;

  // Process multiline blocks
  let match: RegExpExecArray | null;

  while ((match = multilineRegex.exec(text)) !== null) {
    // Add any text before this multiline block
    const beforeText = text.slice(lastIndex, match.index).trim();
    if (beforeText) {
      // Split by newlines for natural message flow
      const lines = beforeText.split("\n").filter((line) => line.trim());
      messages.push(...lines);
    }

    // Add the multiline content as a single message
    const multilineContent = match[1]?.trim();
    if (multilineContent) {
      messages.push(multilineContent);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last multiline block
  const remainingText = text.slice(lastIndex).trim();
  if (remainingText) {
    const lines = remainingText.split("\n").filter((line) => line.trim());
    messages.push(...lines);
  }

  return messages;
}

// Helper to send messages with typing simulation
async function sendMessagesWithTyping(
  ctx: Context,
  messages: Array<string>
): Promise<void> {
  console.log(`Starting to send ${messages.length} messages...`);

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`Sending message ${i + 1}/${messages.length}: "${message}"`);

    try {
      // Send typing action
      await ctx.replyWithChatAction("typing");
      console.log("  ✓ Typing indicator sent");

      // Calculate typing delay based on message length (slightly slower, feel natural)
      const typingDelay = Math.min(Math.max(message.length * 40, 700), 3000);
      await new Promise((resolve) => setTimeout(resolve, typingDelay));

      // Send the message
      await ctx.reply(message, {
        link_preview_options: { is_disabled: true },
      });
      console.log("  ✓ Message sent successfully");

      // Brief pause between messages
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`  ✗ Error sending message ${i + 1}:`, error);
      throw error;
    }
  }

  console.log(`✓ All ${messages.length} messages sent successfully`);
}

// /start command - welcome message
bot.command("start", async (ctx) => {
  try {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;
    const lastName = ctx.from?.last_name;

    if (!telegramId) {
      await ctx.reply("sorry, couldn't identify you. try again?");
      return;
    }

    console.log(`/start from telegram ID ${telegramId} (${username})`);

    // Show typing
    await ctx.replyWithChatAction("typing");

    // Handle message through unified action
    const response = await convex.action(api.telegram.handleMessage, {
      telegramId,
      username,
      firstName,
      lastName,
      messageText: "hey i'm ready to start",
      messageId: ctx.message?.message_id ?? 0,
    });

    // Check if authenticated
    if (!response.authenticated) {
      await ctx.reply(
        "hey there! 👋\n\n" +
          "before we start, you need to create an account:\n\n" +
          "https://jym.coach/login\n\n" +
          "once you're logged in, come back and /start again"
      );
      return;
    }

    if (!response.success || response.messages.length === 0) {
      await ctx.reply("hey! ready to get moving?");
      return;
    }

    console.log(`Received ${response.messages.length} messages from agent`);
    console.log("Raw messages:", response.messages);

    // Parse and send messages
    const allMessages = response.messages.flatMap((msg: string) =>
      parseMessages(msg)
    );

    console.log(
      `Parsed into ${allMessages.length} message bubbles:`,
      allMessages
    );
    await sendMessagesWithTyping(ctx, allMessages);
  } catch (error) {
    console.error("Error in /start:", error);
    await ctx.reply(
      "oops, something went wrong. try again or use /help for assistance"
    );
  }
});

// /help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    `hey! here's how to use jym:\n\n` +
      "• just text me naturally - i adapt to you\n" +
      "• /workout - quick workout now\n" +
      "• /reset - start fresh conversation\n" +
      "• /start - restart\n\n" +
      `i'm here to get you moving, let's go 💪`
  );
});

// /workout command - quick workout
bot.command("workout", async (ctx) => {
  try {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;
    const lastName = ctx.from?.last_name;

    if (!telegramId) {
      await ctx.reply("sorry, couldn't identify you. try again?");
      return;
    }

    console.log(`/workout from telegram ID ${telegramId} (${username})`);

    // Show typing
    await ctx.replyWithChatAction("typing");

    // Handle message through unified action
    const response = await convex.action(api.telegram.handleMessage, {
      telegramId,
      username,
      firstName,
      lastName,
      messageText: "ready for a workout",
      messageId: ctx.message?.message_id ?? 0,
    });

    // Check if authenticated
    if (!response.authenticated) {
      await ctx.reply("you need to /start first and create an account");
      return;
    }

    if (!response.success || response.messages.length === 0) {
      await ctx.reply("alright let's do this!");
      return;
    }

    console.log(`Received ${response.messages.length} messages from agent`);
    console.log("Raw messages:", response.messages);

    // Parse and send messages
    const allMessages = response.messages.flatMap((msg: string) =>
      parseMessages(msg)
    );

    console.log(
      `Parsed into ${allMessages.length} message bubbles:`,
      allMessages
    );
    await sendMessagesWithTyping(ctx, allMessages);
  } catch (error) {
    console.error("Error in /workout:", error);
    await ctx.reply("oops, something went wrong. try /help");
  }
});

// /reset command - reset conversation
bot.command("reset", async (ctx) => {
  try {
    await ctx.reply("conversation reset. let's start fresh!");
    await ctx.reply("use /start to begin again");
  } catch (error) {
    console.error("Error in /reset:", error);
    await ctx.reply("oops, something went wrong");
  }
});

// Handle all text messages
bot.on("message:text", async (ctx) => {
  try {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;
    const lastName = ctx.from?.last_name;
    const messageText = ctx.message.text;

    if (!(telegramId && messageText)) {
      return;
    }

    // Skip if it's a command (already handled)
    if (messageText.startsWith("/")) {
      return;
    }

    console.log(`Message from ${username || telegramId}: ${messageText}`);

    // Show typing indicator
    await ctx.replyWithChatAction("typing");

    // Handle message through unified action
    const response = await convex.action(api.telegram.handleMessage, {
      telegramId,
      username,
      firstName,
      lastName,
      messageText,
      messageId: ctx.message.message_id,
    });

    // Check if authenticated
    if (!response.authenticated) {
      await ctx.reply(
        "hey! you need to create an account first:\n\n" +
          "https://jym.coach/login\n\n" +
          "once you're in, come back and /start"
      );
      return;
    }

    if (!response.success) {
      await ctx.reply(
        response.error
          ? `error: ${response.error}`
          : "sorry, something went wrong. can you try that again?"
      );
      return;
    }

    if (response.messages.length === 0) {
      await ctx.reply("...");
      return;
    }

    console.log(`Received ${response.messages.length} messages from agent`);
    console.log("Raw messages:", response.messages);

    // Parse and send messages
    const allMessages = response.messages.flatMap((msg: string) =>
      parseMessages(msg)
    );

    console.log(
      `Parsed into ${allMessages.length} message bubbles:`,
      allMessages
    );
    await sendMessagesWithTyping(ctx, allMessages);
  } catch (error) {
    console.error("Error handling message:", error);
    await ctx.reply("sorry, something went wrong. can you try that again?");
  }
});

// Error handler
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  console.error("Error:", e);
});

console.log("🏃 jym fitness coach bot starting...");
console.log("💪 ready to get people moving!");
console.log("🤖 connected to convex at", process.env.CONVEX_URL);

bot.start();
