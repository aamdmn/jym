"use client";

import { IconChevronLeft } from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TelegramLoginButton } from "@/components/telegram-login";
import runner from "../../../public/runner.png";
import { authClient } from "../../lib/auth-client";

export default function LinkTelegramPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  // Handle redirects in useEffect to avoid redirect loops
  useEffect(() => {
    if (!isPending) {
      const user = session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      // Give session time to update after phone verification
      // Only redirect if user REALLY doesn't have a phone number
      if (!user.phoneNumber) {
        // Wait a bit to check if phone number is being updated
        const timeoutId = setTimeout(() => {
          if (!session?.user?.phoneNumber) {
            router.push("/verify-phone");
          }
        }, 1000);

        return () => clearTimeout(timeoutId);
      }

      setIsChecking(false);
    }
  }, [isPending, session, router]);

  // Show loading while checking authentication
  if (isPending || isChecking) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const user = session?.user;

  if (!user?.phoneNumber) {
    return null;
  }

  const handleTelegramAuth = () => {
    // After successful Telegram auth, redirect to onboarding
    router.push("/onboarding");
    router.refresh();
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
        <button
          className="flex items-center gap-2 text-background/80 transition-colors hover:text-background"
          onClick={() => router.back()}
          type="button"
        >
          <IconChevronLeft className="size-4" />
          Back
        </button>

        <div className="text-start">
          <h1 className="font-medium font-serif text-3xl text-background">
            Connect Telegram
          </h1>
          <p className="mt-3 text-background/80 text-base leading-relaxed">
            Link your Telegram account to chat with Jym, your AI fitness coach.
            Get personalized workouts, reminders, and motivation right in
            Telegram.
          </p>
        </div>

        <div className="space-y-6">
          {/* Features */}
          <div className="space-y-3 rounded-lg bg-background/10 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <p className="text-background/90 text-sm">
                Get instant workout guidance through Telegram
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <p className="text-background/90 text-sm">
                Receive personalized reminders and check-ins
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <p className="text-background/90 text-sm">
                Track your progress and get adaptive workouts
              </p>
            </div>
          </div>

          {/* Telegram Login Button */}
          {botUsername ? (
            <div className="flex justify-center">
              <TelegramLoginButton
                botUsername={botUsername}
                buttonSize="large"
                cornerRadius={8}
                onAuth={handleTelegramAuth}
              />
            </div>
          ) : (
            <div className="rounded-md bg-destructive/10 p-3 text-center backdrop-blur-sm">
              <p className="text-destructive text-sm">
                Telegram login is not configured. Please contact support.
              </p>
            </div>
          )}

          {/* Info about requirement */}
          <div className="text-center">
            <p className="text-background/70 text-sm">
              Telegram connection is required to use Jym's AI coaching features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
