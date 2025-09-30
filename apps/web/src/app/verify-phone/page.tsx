"use client";

import { IconChevronLeft } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import OTPInputComponent from "@/components/otp-input";
import PhoneInputComponent from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { api } from "../../../../../packages/backend/convex/_generated/api";
import runner from "../../../public/runner.png";
import { authClient } from "../../lib/auth-client";

type FormStep = "phone" | "otp";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

export default function VerifyPhonePage() {
  const [step, setStep] = useState<FormStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const { data: session, isPending } = authClient.useSession();
  const cooldownTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const router = useRouter();

  // Convex rate limiting hooks
  const checkRateLimit = useQuery(
    api.otpRateLimit.checkSendOtpAllowed,
    phoneNumber ? { phoneNumber } : "skip"
  );
  const logSendAttempt = useMutation(api.otpRateLimit.logSendAttempt);
  const logVerifyAttempt = useMutation(api.otpRateLimit.logVerifyAttempt);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const user = session?.user;

  // Show loading while checking authentication
  if (isPending) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);

    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async (phoneNumberValue: string) => {
    if (!phoneNumberValue) {
      setError("Please enter a valid phone number");
      return;
    }

    if (resendCooldown > 0) {
      setError(
        `Please wait ${resendCooldown} seconds before requesting another code`
      );
      return;
    }

    // Check server-side rate limiting
    if (checkRateLimit && !checkRateLimit.allowed) {
      setError(
        checkRateLimit.reason || "Rate limit exceeded. Please try again later."
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: otpError } = await authClient.phoneNumber.sendOtp({
        phoneNumber: phoneNumberValue,
      });

      if (otpError) {
        // Log failed attempt
        await logSendAttempt({
          phoneNumber: phoneNumberValue,
          success: false,
        });

        const errorMsg = otpError.message || "Failed to send OTP";
        setError(errorMsg);
      } else {
        // Log successful attempt
        await logSendAttempt({
          phoneNumber: phoneNumberValue,
          success: true,
        });

        setStep("otp");
        setVerificationAttempts(0);
        startCooldown();
      }
    } catch {
      // Log failed attempt on exception
      await logSendAttempt({
        phoneNumber: phoneNumberValue,
        success: false,
      });
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationError = (verifyError: {
    status?: number;
    message?: string;
  }) => {
    if (verifyError.status === 403) {
      return "Too many verification attempts. Please request a new code.";
    }
    if (
      verifyError.message?.includes("Invalid") ||
      verifyError.message?.includes("code")
    ) {
      return "Invalid verification code. Please check your code and try again.";
    }
    return verifyError.message || "Verification failed. Please try again.";
  };

  const handleVerifyError = async (verifyError: {
    status?: number;
    message?: string;
  }) => {
    await logVerifyAttempt({ phoneNumber, success: false });
    setVerificationAttempts((prev) => prev + 1);

    const remainingAttempts =
      MAX_VERIFICATION_ATTEMPTS - verificationAttempts - 1;
    let errorMsg = handleVerificationError(verifyError);

    if (remainingAttempts > 0 && remainingAttempts <= 3) {
      errorMsg += ` (${remainingAttempts} attempts remaining)`;
    }

    setError(errorMsg);
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      setError("Too many failed attempts. Please request a new code.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber,
        code: otpCode,
        disableSession: false,
        updatePhoneNumber: true,
      });

      if (verifyError) {
        await handleVerifyError(verifyError);
      } else {
        await logVerifyAttempt({ phoneNumber, success: true });
        router.push("/onboarding");
      }
    } catch (err) {
      await logVerifyAttempt({ phoneNumber, success: false });
      setVerificationAttempts((prev) => prev + 1);

      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorText = errorMessage.includes("Too many attempts")
        ? "Too many verification attempts. Please request a new code."
        : "Failed to verify code. Please try again.";
      setError(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtpCode("");
    setError("");
  };

  const handleResendOtp = async () => {
    await sendOtp(phoneNumber);
  };

  const getResendButtonText = () => {
    if (isLoading) {
      return "Sending...";
    }
    if (resendCooldown > 0) {
      return `Resend code in ${resendCooldown}s`;
    }
    return "Didn't receive the code? Resend";
  };

  // Show loading while checking authentication
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
        {step === "otp" && (
          <button
            className="flex items-center gap-2 text-background/80 transition-colors hover:text-background"
            onClick={handleBackToPhone}
            type="button"
          >
            <IconChevronLeft className="size-4" />
            Back
          </button>
        )}

        <div className="text-start">
          <h1 className="font-medium font-serif text-2xl text-background">
            {step === "phone"
              ? "What's your phone number?"
              : "Verify your phone number"}
          </h1>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-4">
            <form
              className="flex flex-col gap-8"
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp(phoneNumber);
              }}
            >
              <PhoneInputComponent
                onChange={setPhoneNumber}
                phoneNumber={phoneNumber}
              />
              <Button
                className="h-14"
                disabled={isLoading || !phoneNumber}
                size="lg"
                type="submit"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            {verificationAttempts > 0 &&
              verificationAttempts < MAX_VERIFICATION_ATTEMPTS && (
                <div className="rounded-md bg-yellow-500/10 p-3 text-center">
                  <p className="text-sm text-yellow-200">
                    {MAX_VERIFICATION_ATTEMPTS - verificationAttempts}{" "}
                    verification attempts remaining
                  </p>
                </div>
              )}

            <form
              className="flex flex-col gap-8"
              onSubmit={(e) => {
                e.preventDefault();
                verifyOtp();
              }}
            >
              <OTPInputComponent
                maxLength={6}
                onChange={setOtpCode}
                value={otpCode}
              />
              <Button
                className="h-14"
                disabled={
                  isLoading ||
                  otpCode.length !== 6 ||
                  verificationAttempts >= MAX_VERIFICATION_ATTEMPTS
                }
                size="lg"
                type="submit"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                className="text-background/70 transition-colors hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || resendCooldown > 0}
                onClick={handleResendOtp}
                type="button"
              >
                {getResendButtonText()}
              </button>
              <button
                className="text-background/70 transition-colors hover:text-background"
                disabled={isLoading}
                onClick={handleBackToPhone}
                type="button"
              >
                Change phone number
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
