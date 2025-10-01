"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Server-side layout already validated phone + email
    // Just redirect to app immediately
    const timeoutId = setTimeout(() => {
      router.push("/app");
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [router]);

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
