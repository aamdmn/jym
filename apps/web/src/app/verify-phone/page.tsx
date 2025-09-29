"use client";

import { IconChevronLeft } from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import OTPInputComponent from "@/components/otp-input";
import PhoneInputComponent from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import runner from "../../../public/runner.png";
import { authClient } from "../../lib/auth-client";

type FormStep = "phone" | "otp";

export default function VerifyPhonePage() {
  const [step, setStep] = useState<FormStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session, isPending } = authClient.useSession();

  const router = useRouter();

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
  }

  const sendOtp = async (phoneNumberValue: string) => {
    if (!phoneNumberValue) {
      setError("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: otpError } = await authClient.phoneNumber.sendOtp({
        phoneNumber: phoneNumberValue,
      });

      if (otpError) {
        setError(otpError.message || "Failed to send OTP");
      } else {
        setStep("otp");
      }
    } catch {
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

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber,
        code: otpCode,
        disableSession: false,
        updatePhoneNumber: true, // Always update phone number for existing user
      });

      if (verifyError) {
        setError(handleVerificationError(verifyError));
      } else {
        // Successful verification - redirect to onboarding
        router.push("/onboarding");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage.includes("Too many attempts")) {
        setError("Too many verification attempts. Please request a new code.");
      } else {
        setError("Failed to verify code. Please try again.");
      }
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
                disabled={isLoading || otpCode.length !== 6}
                size="lg"
                type="submit"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                className="text-background/70 transition-colors hover:text-background"
                disabled={isLoading}
                onClick={handleResendOtp}
                type="button"
              >
                {isLoading ? "Sending..." : "Didn't receive the code? Resend"}
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
