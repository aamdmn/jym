"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { useCustomer } from "autumn-js/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type OnboardingStep = "measuring" | "billing";

// Helper function to get progress indicator colors
function getProgressColor(
  currentStep: OnboardingStep,
  targetStep: OnboardingStep
): string {
  const stepOrder = ["measuring", "billing"];
  const currentIndex = stepOrder.indexOf(currentStep);
  const targetIndex = stepOrder.indexOf(targetStep);

  if (currentIndex === targetIndex) {
    return "bg-primary";
  }
  if (currentIndex > targetIndex) {
    return "bg-primary/30";
  }
  return "bg-primary/30";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("measuring");
  const [measuringSystem, setMeasuringSystem] = useState<"metric" | "imperial">(
    "metric"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { checkout, customer } = useCustomer();

  // Convex mutations
  const updateMeasuringSystem = useMutation(api.users.updateMeasuringSystem);
  const createUserProfile = useMutation(api.users.createUserProfile);

  // Check onboarding status
  const onboardingStatus = useQuery(
    api.users.checkOnboardingStatus,
    customer?.id ? { userId: customer?.id } : "skip"
  );

  // Redirect if onboarding is already complete
  // useEffect(() => {
  //   if (onboardingStatus?.onboardingComplete) {
  //     router.push("/app");
  //   }
  // }, [onboardingStatus, router]);

  const handleMeasuringSystemNext = async () => {
    if (!customer?.id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Create profile if it doesn't exist
      if (onboardingStatus?.hasProfile) {
        // Update existing profile
        await updateMeasuringSystem({
          userId: customer?.id,
          mesuringSystem: measuringSystem,
        });
      } else {
        await createUserProfile({
          userId: customer?.id,
          platform: "iMessage",
          mesuringSystem: measuringSystem,
        });
      }

      setStep("billing");
    } catch {
      setError("Failed to save measuring system. Please try again.");
      // Uncomment for debugging: console.error("Error updating measuring system:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreePlanSelect = () => {
    if (!customer?.id) {
      return;
    }

    router.push("/app");
  };

  const handlePaidPlanSelect = async () => {
    if (!customer?.id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Checkout with Autumn - this will handle the payment flow
      const { error: checkoutError } = await checkout({
        productId: "pay_as_you_go", // Adjust this to match your Autumn product ID
        successUrl: `${window.location.origin}/app`,
      });

      if (checkoutError) {
        setError("Failed to process payment. Please try again.");
      } else {
        // Go to complete step if checkout was successful
        router.push("/app");
      }
    } catch {
      setError("Failed to process payment. Please try again.");
      // console.error("Error processing payment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!customer?.id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="min-h-[40%] w-full max-w-md space-y-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div
            className={`h-2 w-8 rounded-full ${getProgressColor(step, "measuring")}`}
          />
          <div
            className={`h-2 w-8 rounded-full ${getProgressColor(step, "billing")}`}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-center">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Measuring System */}
        {step === "measuring" && (
          <div className="min-h-full space-y-6 rounded-2xl border border-dashed bg-white p-8">
            <div className="mb-20 text-center">
              <h1 className="font-medium font-serif text-2xl text-gray-900">
                Welcome to Jym!
              </h1>
              <p className="mt-2 text-gray-600">
                Let's get you set up in just a few steps.
              </p>
            </div>

            <div className="space-y-4">
              <div className="block font-serif text-gray-700">
                Choose your preferred measuring system:
              </div>

              <ToggleGroup
                className="grid w-full grid-cols-2 gap-0"
                onValueChange={(measuringValue: "metric" | "imperial") => {
                  setMeasuringSystem(measuringValue);
                }}
                type="single"
                value={measuringSystem}
                variant="outline"
              >
                <ToggleGroupItem className="h-20 text-center" value="metric">
                  <div className="flex flex-col items-center space-y-1">
                    <span className="font-medium">Metric</span>
                    <span className="font-serif text-gray-500 text-sm">
                      kg, cm
                    </span>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem className="h-20 text-center" value="imperial">
                  <div className="flex flex-col items-center space-y-1">
                    <span className="font-medium">Imperial</span>
                    <span className="font-serif text-gray-500 text-sm">
                      lbs, ft/in
                    </span>
                  </div>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Button
              className="w-full"
              disabled={isLoading}
              onClick={handleMeasuringSystemNext}
              size="lg"
            >
              {isLoading ? "Saving..." : "Continue"}
            </Button>
          </div>
        )}

        {/* Step 2: Billing Plans */}
        {step === "billing" && (
          <div className="space-y-6 rounded-2xl border border-dashed bg-white p-8">
            <div className="text-center">
              <h1 className="font-medium font-serif text-2xl text-gray-900">
                Choose Your Plan
              </h1>
              <p className="mt-2 text-gray-600">
                Select the plan that works best for you.
              </p>
            </div>

            <div className="space-y-4">
              {/* Free Plan */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="space-y-2">
                  <h3 className="font-medium font-serif text-lg">Free Plan</h3>
                  <p className="text-gray-600 text-sm">
                    Get started with basic features at no cost.
                  </p>
                  <ul className="space-y-1 text-gray-600 text-sm">
                    <li>• Limited workout plans</li>
                    <li>• Basic progress tracking</li>
                    <li>• Community support</li>
                  </ul>
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={isLoading}
                  onClick={handleFreePlanSelect}
                  variant="outline"
                >
                  {isLoading ? "Processing..." : "Continue Free"}
                </Button>
              </div>

              {/* Pay-as-you-go Plan */}
              <div className="rounded-lg border-2 border-blue-400 border-dashed bg-blue-50 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium font-serif text-lg">
                      Pay-as-you-go
                    </h3>
                    <span className="rounded-full bg-blue-600 px-2 py-1 font-semibold text-white text-xs">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Only pay for what you use with our flexible pricing.
                  </p>
                  <ul className="space-y-1 text-gray-700 text-sm">
                    <li>• Unlimited workout plans</li>
                    <li>• Advanced progress tracking</li>
                    <li>• AI-powered coaching</li>
                    <li>• Priority support</li>
                  </ul>
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={isLoading}
                  onClick={handlePaidPlanSelect}
                  size="lg"
                >
                  {isLoading ? "Processing..." : "Get Started"}
                </Button>
              </div>
            </div>

            <div className="text-center">
              <button
                className="cursor-pointer text-gray-500 text-sm transition-colors hover:text-gray-700"
                disabled={isLoading}
                onClick={() => setStep("measuring")}
                type="button"
              >
                ← Back to measuring system
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
