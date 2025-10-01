import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth-server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();

  const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  // Not authenticated at all
  if (!user) {
    redirect("/login");
  }

  // No phone number verified yet
  if (!user.phoneNumber) {
    redirect("/verify-phone");
  }

  // Has phone number - can proceed to onboarding/app
  // The page itself will handle the final redirect to /app
  return <div>{children}</div>;
}
