"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkoutCard from "@/components/workout-card";
import { authClient } from "@/lib/auth-client";

export default function Page() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const userProfile = useQuery(
    api.users.getUserProfile,
    userId ? { userId } : "skip"
  );

  const activeWorkout = useQuery(
    api.workouts.getActiveWorkoutByUserId,
    userId ? { userId } : "skip"
  );

  const lastWorkout = useQuery(
    api.workouts.getLastWorkoutByUserId,
    userId && !activeWorkout ? { userId } : "skip"
  );

  // Helper function to create iMessage deep link
  function createiMessageDeepLink(message?: string): void {
    const recipient = "sandbox.loopmessage.com@imsg.im";
    const defaultMessage = message || "Let's go!";
    const encodedMessage = encodeURIComponent(defaultMessage);
    const deepLink = `imessage://compose?recipient=${recipient}&body=${encodedMessage}`;

    window.location.href = deepLink;
  }

  // Loading state
  if (userProfile === undefined || activeWorkout === undefined) {
    return (
      <div className="my-10 flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="mb-4 h-10 w-3/4 rounded-lg bg-gray-200" />
          <div className="mb-3 h-6 w-full rounded-lg bg-gray-200" />
          <div className="h-10 w-32 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  // State 1: User hasn't completed onboarding
  if (!userProfile?.onboardingComplete) {
    return (
      <div className="my-10 flex flex-col gap-6">
        <div>
          <h1 className="mb-3 font-serif text-4xl text-primary">
            Welcome to Jym
          </h1>
          <p className="text-lg text-muted-foreground">
            Complete your onboarding first to get started with personalized
            workouts
          </p>
        </div>
        <Button
          className="w-fit"
          onClick={() => {
            createiMessageDeepLink("I want to get started with Jym!");
          }}
          size="lg"
        >
          <MessageCircle className="size-5" />
          Complete Onboarding
        </Button>
      </div>
    );
  }

  // State 2: User has completed onboarding but has no workouts
  const hasWorkouts = activeWorkout || lastWorkout;
  if (!hasWorkouts) {
    return (
      <div className="my-10 flex flex-col gap-6">
        <div>
          <h1 className="mb-3 font-serif text-4xl text-primary">
            Ready to start?
          </h1>
          <p className="text-lg text-muted-foreground">
            Just text Jym to begin your first workout
          </p>
        </div>
        <Button
          className="w-fit"
          onClick={() => {
            createiMessageDeepLink("Let's start a workout!");
          }}
          size="lg"
        >
          <MessageCircle className="size-5" />
          Start Workout
        </Button>
      </div>
    );
  }

  // State 3: User has an active workout
  if (activeWorkout) {
    const completedCount = activeWorkout.exercises.filter(
      (ex) => ex.completed
    ).length;
    const totalCount = activeWorkout.exercises.length;

    return (
      <div className="my-10 flex flex-col gap-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h1 className="font-serif text-3xl text-primary">Active Workout</h1>
            <span className="text-muted-foreground text-sm">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          <p className="text-muted-foreground">
            {new Date(activeWorkout.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <WorkoutCard
          currentExerciseIndex={activeWorkout.currentExerciseIndex}
          exercises={activeWorkout.exercises}
          isActive={true}
        />
        <Button
          className="w-fit"
          onClick={() => {
            createiMessageDeepLink("Continue workout");
          }}
          size="lg"
        >
          <MessageCircle className="size-5" />
          Continue in Chat
        </Button>
      </div>
    );
  }

  // State 4: User has workouts but none are active (show last workout)
  if (lastWorkout) {
    return (
      <div className="my-10 flex flex-col gap-6">
        <div>
          <h1 className="mb-3 font-serif text-3xl text-primary">
            Last Workout
          </h1>
          <p className="text-muted-foreground">
            {new Date(lastWorkout.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <WorkoutCard exercises={lastWorkout.exercises} isActive={false} />
        <Button
          className="w-fit"
          onClick={() => {
            createiMessageDeepLink("Let's start a new workout!");
          }}
          size="lg"
        >
          <MessageCircle className="size-5" />
          Start New Workout
        </Button>
      </div>
    );
  }

  return null;
}
