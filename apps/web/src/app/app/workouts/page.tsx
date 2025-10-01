"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Calendar, CheckCircle2, Dumbbell, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WorkoutCard from "@/components/workout-card";
import { authClient } from "@/lib/auth-client";
import { createTelegramDeepLink } from "@/lib/utils";

export default function WorkoutsPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Check if there's an active workout
  const activeWorkout = useQuery(
    api.workouts.getActiveWorkoutByUserId,
    userId ? { userId } : "skip"
  );

  // Get paginated completed workouts
  const { results, status, loadMore } = usePaginatedQuery(
    api.workouts.getAllWorkoutsByUserId,
    userId ? { userId } : "skip",
    { initialNumItems: 10 }
  );

  // Loading state
  if (status === "LoadingFirstPage") {
    return (
      <div className="my-10 flex flex-col gap-6">
        <div className="animate-pulse">
          <div className="mb-2 h-10 w-3/4 rounded-lg bg-gray-200" />
          <div className="mb-6 h-5 w-1/2 rounded-lg bg-gray-200" />
          <div className="h-32 w-full rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!results || results.length === 0) {
    return (
      <div className="my-10 flex flex-col gap-6">
        <div>
          <h1 className="mb-2 font-serif text-4xl text-primary">Workouts</h1>
          <p className="text-muted-foreground">Your workout history</p>
        </div>

        {/* Active workout banner */}
        {activeWorkout && (
          <Link
            className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
            href="/app"
          >
            <Dumbbell className="size-5 text-primary" />
            <div className="flex-1">
              <h3 className="font-medium text-sm">Active Workout</h3>
              <p className="text-muted-foreground text-xs">
                {activeWorkout.exercises.length} exercises •{" "}
                {activeWorkout.exercises.filter((ex) => ex.completed).length}{" "}
                completed
              </p>
            </div>
            <Badge variant="default">Continue</Badge>
          </Link>
        )}

        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <Calendar className="size-12 text-muted-foreground" />
          <div>
            <h3 className="mb-1 font-medium">No completed workouts yet</h3>
            <p className="text-muted-foreground text-sm">
              Complete your first workout to see it here
            </p>
          </div>
          <Button
            onClick={() => {
              createTelegramDeepLink({ message: "let's start a workout!" });
            }}
            size="lg"
          >
            <MessageCircle className="size-5" />
            Start Workout
          </Button>
        </div>
      </div>
    );
  }

  // Group workouts by date
  const groupedWorkouts: Record<string, (typeof results)[0][]> = results.reduce(
    (acc, workout) => {
      const date = workout.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(workout);
      return acc;
    },
    {} as Record<string, (typeof results)[0][]>
  );

  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) =>
    b.localeCompare(a)
  );

  return (
    <div className="my-10 flex flex-col gap-6">
      <div>
        <h1 className="mb-2 font-serif text-4xl text-primary">Workouts</h1>
        <p className="text-muted-foreground">
          {results.length} completed workout
          {results.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Active workout banner */}
      {activeWorkout && (
        <Link
          className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
          href="/app"
        >
          <Dumbbell className="size-5 text-primary" />
          <div className="flex-1">
            <h3 className="font-medium text-sm">Active Workout</h3>
            <p className="text-muted-foreground text-xs">
              {activeWorkout.exercises.length} exercises •{" "}
              {activeWorkout.exercises.filter((ex) => ex.completed).length}{" "}
              completed
            </p>
          </div>
          <Badge variant="default">Continue</Badge>
        </Link>
      )}

      <div className="flex flex-col gap-8">
        {sortedDates.map((date) => {
          const dateWorkouts = groupedWorkouts[date];
          if (!dateWorkouts) {
            return null;
          }

          const dateObj = new Date(date);
          const isToday =
            dateObj.toISOString().split("T")[0] ===
            new Date().toISOString().split("T")[0];

          return (
            <div className="flex flex-col gap-3" key={date}>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-foreground text-xl">
                  {dateObj.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h2>
                {isToday && (
                  <Badge className="text-xs" variant="default">
                    Today
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {dateWorkouts.map((workout) => {
                  const completedCount = workout.exercises.filter(
                    (ex) => ex.completed
                  ).length;
                  const totalCount = workout.exercises.length;
                  const isFullyCompleted = workout.completed;

                  return (
                    <div
                      className="flex flex-col gap-3 rounded-lg border p-4"
                      key={workout._id}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">
                            {new Date(workout._creationTime).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {isFullyCompleted && (
                            <CheckCircle2 className="size-4 text-primary" />
                          )}
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {completedCount}/{totalCount} exercises
                        </span>
                      </div>
                      <WorkoutCard
                        exercises={workout.exercises}
                        isActive={false}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more button */}
      {status === "CanLoadMore" && (
        <Button
          className="w-full"
          disabled={status !== "CanLoadMore"}
          onClick={() => {
            loadMore(10);
          }}
          size="lg"
          variant="outline"
        >
          Load More
        </Button>
      )}

      {/* Loading more indicator */}
      {status === "LoadingMore" && (
        <div className="flex items-center justify-center py-4">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <Button
        className="w-fit"
        onClick={() => {
          createTelegramDeepLink({ message: "let's start a new workout!" });
        }}
        size="lg"
        variant="outline"
      >
        <MessageCircle className="size-5" />
        Start New Workout
      </Button>
    </div>
  );
}
