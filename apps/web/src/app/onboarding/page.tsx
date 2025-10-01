"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export default function OnboardingPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && session?.user) {
      const user = session.user;

      // Check if user has completed all required steps
      if (!user.emailVerified) {
        // Not signed in with Google
        router.push("/login");
        return;
      }

      if (!user.phoneNumber) {
        // No phone number verified
        router.push("/verify-phone");
        return;
      }

      // TODO: Check if Telegram is linked
      // For now, we'll assume if they got here, they've linked Telegram

      // If all requirements met, show onboarding
      // For now, redirect to app (you can build the actual onboarding form)
      router.push("/app");
    }
  }, [isPending, session, router]);

  // Show loading while checking
  if (isPending || !session?.user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-primary">
          Setting up your profile...
        </h1>
        <p className="mt-2 text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}
