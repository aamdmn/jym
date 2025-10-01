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

        // Link Telegram to existing account using better-auth
        // This will update the current user's account with Telegram data
        await authClient.signIn.telegram(user);

        // Wait for session to update
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Get current session to get userId
        const { data: session } = await authClient.getSession();
        const userId = session?.user?.id;

        if (userId) {
          // Link Telegram ID directly to userProfile using data from the widget
          console.log("Linking Telegram to userProfile...");

          // Import api dynamically to avoid circular dependencies
          const { api } = await import("@jym/backend/convex/_generated/api");
          const ConvexReactClient = (await import("convex/react"))
            .ConvexReactClient;

          // Get convex client instance
          const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
          if (convexUrl) {
            const tempConvex = new ConvexReactClient(convexUrl);
            const linkResult = await tempConvex.mutation(
              api.users.linkTelegramToProfile,
              {
                userId,
                telegramId: user.id, // Telegram ID directly from widget
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name,
              }
            );

            console.log("Telegram link result:", linkResult);

            if (!linkResult.success) {
              console.error("Failed to link Telegram:", linkResult.message);
              alert(
                `Telegram connected, but link failed: ${linkResult.message}`
              );
              return;
            }

            console.log("✅ Telegram linked successfully:", linkResult.message);
          }
        }

        // Callback if provided (from link-telegram page)
        if (onAuth) {
          onAuth();
        } else {
          // Default: go to onboarding after linking
          router.push("/onboarding");
        }

        router.refresh();
      } catch (error) {
        console.error("Telegram authentication failed:", error);
        alert("Failed to connect Telegram. Please try again.");
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
