import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";

export default async function VerifyPhoneLayout({
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

  // If user already has phone number, move to next step
  if (user.phoneNumber) {
    // Check if they have Telegram linked
    const profile = await fetchQuery(
      api.users.getUserProfile,
      { userId: user.id },
      { token }
    );

    if (profile?.telegramId) {
      // Has phone and Telegram, check onboarding
      if (profile.onboardingComplete) {
        redirect("/app");
      }
      redirect("/onboarding");
    }

    // Has phone but no Telegram
    redirect("/link-telegram");
  }

  return <div>{children}</div>;
}
