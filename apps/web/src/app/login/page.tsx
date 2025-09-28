"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OTPInputComponent from "@/components/otp-input";
import PhoneInputComponent from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import { authClient } from "../../lib/auth-client";

type FormStep = "phone" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<FormStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
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
        updatePhoneNumber: false,
      });

      if (verifyError) {
        setError(handleVerificationError(verifyError));
      } else {
        // Successful verification - user should now be signed up and logged in
        // Redirect to onboarding page - it will handle checking if onboarding is complete
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

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-bold text-2xl">
            {step === "phone" ? "Sign In" : "Verify Your Phone"}
          </h1>
          {step === "otp" && (
            <p className="mt-2 text-muted-foreground text-sm">
              We've sent a verification code to {phoneNumber}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {step === "otp" && !error && (
          <div className="rounded-md bg-blue/10 p-3 text-center">
            <p className="text-blue text-sm">
              Enter the 6-digit code sent to your phone. This will create your
              account automatically.
            </p>
          </div>
        )}

        {step === "phone" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              sendOtp(phoneNumber);
            }}
          >
            <PhoneInputComponent
              onChange={setPhoneNumber}
              phoneNumber={phoneNumber}
            />
            <Button disabled={isLoading || !phoneNumber} type="submit">
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                verifyOtp();
              }}
            >
              <OTPInputComponent
                label="Enter verification code"
                maxLength={6}
                onChange={setOtpCode}
                value={otpCode}
              />
              <Button
                disabled={isLoading || otpCode.length !== 6}
                type="submit"
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>

            <div className="flex flex-col gap-2 text-center text-sm">
              <button
                className="text-muted-foreground transition-colors hover:text-foreground"
                disabled={isLoading}
                onClick={handleResendOtp}
                type="button"
              >
                {isLoading ? "Sending..." : "Didn't receive the code? Resend"}
              </button>
              <button
                className="text-muted-foreground transition-colors hover:text-foreground"
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
