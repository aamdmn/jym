import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createWhatsAppDeepLink({ message }: { message: string }): void {
  // Replace with your WhatsApp Business phone number (in international format without +)
  const phoneNumber = "15551902784"; // TODO: Update this with your actual WhatsApp Business number
  const encodedMessage = encodeURIComponent(message);
  // Using wa.me link which works on both mobile and desktop
  const deepLink = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  window.open(deepLink, "_blank");
}
