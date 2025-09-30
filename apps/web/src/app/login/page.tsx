"use client";

import { IconBrandGoogle } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import runner from "../../../public/runner.png";
import { authClient } from "../../lib/auth-client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError("");

    try {
      // This will redirect to Google and then back to /verify-phone for new users
      // or directly to /app for returning users
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/app", // All users go to phone verification first
        newUserCallbackURL: "/verify-phone",
      });
    } catch {
      setError("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center">
      {/* Background Image */}
      <Image
        alt="runner"
        className="-z-20 absolute inset-0 object-cover"
        fill
        src={runner}
      />

      {/* Dark Overlay */}
      <div className="-z-10 absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md space-y-10">
        <div className="text-start">
          <h1 className="font-medium font-serif text-3xl text-background">
            Welcome to Jym
          </h1>
          <p className="mt-2 text-background/70 text-sm">
            Sign in with your Google account to get started
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center backdrop-blur-sm">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            className="flex h-14 w-full items-center justify-center gap-3 font-medium text-base"
            disabled={isLoading}
            onClick={signInWithGoogle}
            size="lg"
          >
            <IconBrandGoogle className="mb-1 size-5 fill-primary stroke-none" />
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>
        </div>
      </div>
    </div>
  );
}
