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

  const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  // Not authenticated at all
  if (!user) {
    redirect("/login");
  }

  // Already has phone number - skip to next step
  if (user.phoneNumber) {
    redirect("/link-telegram");
  }

  // Needs to verify phone
  return <div>{children}</div>;
}
