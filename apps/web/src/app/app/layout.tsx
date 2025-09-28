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

  const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  if (!user) {
    redirect("/login");
  }

  if (!user.phoneNumber) {
    redirect("/verify-phone");
  }

  return <div>{children}</div>;
}
