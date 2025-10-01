import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";

export default async function LinkTelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  if (!user) {
    redirect("/login");
  }

  // Must have phone number first
  if (!user.phoneNumber) {
    redirect("/verify-phone");
  }

  // Check if already has Telegram linked
  const profile = await fetchQuery(
    api.users.getUserProfile,
    { userId: user.id },
    { token }
  );

  if (profile?.telegramId) {
    // Already has Telegram, check onboarding
    if (profile.onboardingComplete) {
      redirect("/app");
    }
    redirect("/onboarding");
  }

  return <div>{children}</div>;
}
