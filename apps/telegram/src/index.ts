/** biome-ignore-all lint/suspicious/noConsole: <explanation> */
import { Bot, type Context } from "grammy";

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
const bot = new Bot<Context>(process.env.TELEGRAM_BOT_API_KEY);

console.log("🏃 fitness coach bot starting with conversations...");
console.log("💪 ready to get people moving with persistent context!");

bot.start();
