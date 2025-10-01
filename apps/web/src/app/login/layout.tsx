import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();

  if (!token) {
    return <div>{children}</div>;
  }

  const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  if (!user) {
    return <div>{children}</div>;
  }

  // User is logged in, check their onboarding status
  if (!user.phoneNumber) {
    redirect("/verify-phone");
  }

  // Get user profile to check Telegram and onboarding
  const profile = await fetchQuery(
    api.users.getUserProfile,
    { userId: user._id },
    { token }
  );

  if (!profile?.telegramId) {
    redirect("/link-telegram");
  }

  if (!profile.onboardingComplete) {
    redirect("/onboarding");
  }

  // All steps complete, go to app
  redirect("/app");
}
