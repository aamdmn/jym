"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function OnboardingPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Only proceed when session is loaded and we haven't started redirecting
    if (!(isPending || isRedirecting) && session?.user) {
      const user = session.user;

      // Simple validation - just redirect to app
      // The app itself will handle onboarding checks
      if (user.emailVerified && user.phoneNumber) {
        setIsRedirecting(true);
        // Give it a moment to ensure everything is set up
        setTimeout(() => {
          router.push("/app");
        }, 500);
      } else if (!user.emailVerified) {
        router.push("/login");
      } else if (!user.phoneNumber) {
        router.push("/verify-phone");
      }
    }
  }, [isPending, isRedirecting, session, router]);

  // Show loading state
  if (isPending || isRedirecting || !session?.user) {
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
