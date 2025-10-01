import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { telegramClient } from "telegram-better-auth";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), convexClient(), telegramClient()],
});
