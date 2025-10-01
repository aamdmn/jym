import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";

export default async function AppLayout({
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

  // Must have phone number
  if (!user.phoneNumber) {
    redirect("/verify-phone");
  }

  // Get user profile
  const profile = await fetchQuery(
    api.users.getUserProfile,
    { userId: user._id },
    { token }
  );

  // Must have Telegram linked
  if (!profile?.telegramId) {
    redirect("/link-telegram");
  }

  // Must complete onboarding
  if (!profile.onboardingComplete) {
    redirect("/onboarding");
  }

  return <div>{children}</div>;
}
