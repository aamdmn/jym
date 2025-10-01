"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botUsername: string;
  onAuth?: () => void;
  buttonSize?: "large" | "medium" | "small";
  cornerRadius?: number;
  requestAccess?: boolean;
  usePic?: boolean;
  lang?: string;
}

export function TelegramLoginButton({
  botUsername,
  onAuth,
  buttonSize = "large",
  cornerRadius,
  requestAccess = true,
  usePic = true,
  lang = "en",
}: TelegramLoginButtonProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add Telegram Widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", buttonSize);
    if (cornerRadius !== undefined) {
      script.setAttribute("data-radius", cornerRadius.toString());
    }
    script.setAttribute("data-request-access", requestAccess ? "write" : "");
    script.setAttribute("data-userpic", usePic ? "true" : "false");
    script.setAttribute("data-lang", lang);
    script.setAttribute("data-onauth", "onTelegramAuth(user)");

    // Create callback function
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      try {
        console.log("Telegram auth received:", user);

        // Sign in/link Telegram using better-auth
        const result = await authClient.signIn.telegram(user);

        // Callback if provided
        if (onAuth) {
          onAuth();
          router.refresh();
          return;
        }

        // Default behavior: check if user needs phone verification
        // Refresh session to get updated user data
        router.refresh();

        // Wait a bit for session to update
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get fresh session
        const { data: session } = await authClient.getSession();
        const currentUser = session?.user;

        if (currentUser?.phoneNumber) {
          // Existing user linking Telegram or returning user
          router.push("/onboarding");
        } else {
          // New Telegram user needs phone verification
          router.push("/verify-phone");
        }
      } catch (error) {
        console.error("Telegram authentication failed:", error);
      }
    };

    // Append script to container
    if (ref.current) {
      ref.current.appendChild(script);
    }

    // Cleanup
    return () => {
      delete (window as any).onTelegramAuth;
      if (ref.current && script.parentNode === ref.current) {
        ref.current.removeChild(script);
      }
    };
  }, [
    botUsername,
    buttonSize,
    cornerRadius,
    requestAccess,
    usePic,
    lang,
    onAuth,
    router,
  ]);

  return <div ref={ref} />;
}
