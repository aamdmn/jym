import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createTelegramDeepLink({ message }: { message: string }): void {
  // Get bot username from environment variable
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    console.error("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set");
    return;
  }

  // Encode the message as a start parameter (Telegram bots can receive this)
  // Note: Telegram start parameters are limited to 64 characters and only support A-Z, a-z, 0-9, _ and -
  // For longer messages, we'll just open the bot and let the user type
  const encodedMessage = encodeURIComponent(message);

  // Using t.me link which works on both mobile and desktop
  const deepLink = `https://t.me/${botUsername}?text=${encodedMessage}`;

  window.open(deepLink, "_blank");
}

// Legacy function name for backward compatibility
export function createWhatsAppDeepLink({ message }: { message: string }): void {
  createTelegramDeepLink({ message });
}
