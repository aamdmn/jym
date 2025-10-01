"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Lightbulb,
  Repeat,
  Target,
  Timer,
  Weight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const exercise = useQuery(api.exercises.getExerciseBySlug, { slug });
  const activeWorkout = useQuery(
    api.workouts.getActiveWorkoutByUserId,
    userId ? { userId } : "skip"
  );

  // Find if this exercise is in the active workout
  const workoutExercise = activeWorkout?.exercises.find(
    (ex) => ex.slug === slug
  );
  const isCurrentExercise =
    activeWorkout &&
    workoutExercise &&
    activeWorkout.exercises[activeWorkout.currentExerciseIndex]?.slug === slug;

  // Loading state
  if (exercise === undefined) {
    return (
      <div className="mx-auto my-10 flex max-w-xl flex-col gap-6 px-4">
        <Button asChild className="-ml-4 w-fit" variant="ghost">
          <Link href="/app">
            <ArrowLeft className="size-4" />
            Back to Workout
          </Link>
        </Button>
        <div className="animate-pulse">
          <div className="mb-4 h-12 w-3/4 rounded-lg bg-gray-200" />
          <div className="mb-6 flex gap-2">
            <div className="h-6 w-20 rounded-md bg-gray-200" />
            <div className="h-6 w-24 rounded-md bg-gray-200" />
          </div>
          <div className="aspect-video w-full rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  // Not found state
  if (!exercise) {
    return (
      <div className="mx-auto my-10 flex max-w-xl flex-col gap-6 px-4">
        <Button asChild className="-ml-4 w-fit" variant="ghost">
          <Link href="/app">
            <ArrowLeft className="size-4" />
            Back to Workout
          </Link>
        </Button>
        <div>
          <h1 className="mb-3 font-serif text-4xl text-primary">
            Exercise Not Found
          </h1>
          <p className="text-lg text-muted-foreground">
            The exercise you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto my-10 flex max-w-xl flex-col gap-8 px-4">
      {/* Back Button */}
      <Button asChild className="-ml-4 w-fit" variant="ghost">
        <Link href="/app">
          <ArrowLeft className="size-4" />
          Back to Workout
        </Link>
      </Button>
      {/* Header */}
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="font-serif text-4xl text-primary">{exercise.name}</h1>
          {isCurrentExercise && (
            <Badge className="shrink-0" variant="default">
              Current Exercise
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {exercise.metadata.difficulty && (
            <Badge variant="secondary">{exercise.metadata.difficulty}</Badge>
          )}
          {exercise.metadata.category && (
            <Badge variant="outline">{exercise.metadata.category}</Badge>
          )}
          {exercise.metadata.exercise_type && (
            <Badge variant="outline">{exercise.metadata.exercise_type}</Badge>
          )}
        </div>
      </div>

      {/* Active Workout Context */}
      {workoutExercise && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {workoutExercise.completed ? (
                <>
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span>Completed in Today's Workout</span>
                </>
              ) : (
                <>
                  <Dumbbell className="size-5" />
                  <span>Your Workout Plan</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {workoutExercise.sets && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Repeat className="size-4" />
                  <span className="text-sm">
                    <strong className="text-foreground">
                      {workoutExercise.sets}
                    </strong>{" "}
                    sets
                  </span>
                </div>
              )}
              {workoutExercise.reps && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="size-4" />
                  <span className="text-sm">
                    <strong className="text-foreground">
                      {workoutExercise.reps}
                    </strong>{" "}
                    reps
                  </span>
                </div>
              )}
              {workoutExercise.weight && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Weight className="size-4" />
                  <span className="text-sm">
                    <strong className="text-foreground">
                      {workoutExercise.weight}
                    </strong>{" "}
                    {workoutExercise.unit || "lbs"}
                  </span>
                </div>
              )}
              {workoutExercise.duration && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Timer className="size-4" />
                  <span className="text-sm">
                    <strong className="text-foreground">
                      {workoutExercise.duration}
                    </strong>{" "}
                    {workoutExercise.unit || "seconds"}
                  </span>
                </div>
              )}
            </div>
            {workoutExercise.feedback && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="text-muted-foreground text-sm">
                  <strong className="text-foreground">Feedback:</strong>{" "}
                  {workoutExercise.feedback}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Media */}
      {(exercise.media.primary_gif || exercise.media.primary_video) && (
        <div className="overflow-hidden rounded-xl border bg-muted">
          {exercise.media.primary_gif ? (
            <Image
              alt={exercise.name}
              className="h-auto w-full"
              height={450}
              src={exercise.media.primary_gif}
              unoptimized
              width={800}
            />
          ) : exercise.media.primary_video ? (
            <video
              className="h-auto w-full"
              controls
              src={exercise.media.primary_video}
            >
              Your browser does not support the video tag.
            </video>
          ) : null}
        </div>
      )}

      {/* Muscle Groups */}
      {exercise.muscleGroups.primary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5" />
              Target Muscles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="mb-2 font-medium text-muted-foreground text-sm">
                  Primary
                </p>
                <div className="flex flex-wrap gap-2">
                  {exercise.muscleGroups.primary.map((muscle, idx) => (
                    <Badge key={`primary-${idx}`} variant="default">
                      {muscle.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {exercise.muscleGroups.secondary.length > 0 && (
                <div>
                  <p className="mb-2 font-medium text-muted-foreground text-sm">
                    Secondary
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exercise.muscleGroups.secondary.map((muscle, idx) => (
                      <Badge key={`secondary-${idx}`} variant="outline">
                        {muscle.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment */}
      {(exercise.equipment.primary ||
        exercise.equipment.additional.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="size-5" />
              Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {exercise.equipment.primary && (
                <Badge variant="default">
                  {exercise.equipment.primary.name}
                </Badge>
              )}
              {exercise.equipment.additional.map((equip, idx) => (
                <Badge key={`equipment-${idx}`} variant="outline">
                  {equip.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {(exercise.instructions.main ||
        exercise.instructions.steps.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>How To Perform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exercise.instructions.main && (
                <p className="text-muted-foreground">
                  {exercise.instructions.main}
                </p>
              )}
              {exercise.instructions.steps.length > 0 && (
                <div>
                  <p className="mb-3 font-medium text-sm">Steps</p>
                  <ol className="space-y-2">
                    {exercise.instructions.steps.map((step, idx) => (
                      <li
                        className="flex gap-3 text-muted-foreground"
                        key={`step-${idx}`}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {exercise.instructions.tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-5" />
              Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {exercise.instructions.tips.map((tip, idx) => (
                <li
                  className="flex gap-2 text-muted-foreground"
                  key={`tip-${idx}`}
                >
                  <span className="text-primary">•</span>
                  <span className="flex-1">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {exercise.instructions.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              Safety & Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {exercise.instructions.warnings.map((warning, idx) => (
                <li
                  className="flex gap-2 text-amber-900/80 dark:text-amber-400/80"
                  key={`warning-${idx}`}
                >
                  <span className="text-amber-600 dark:text-amber-500">⚠</span>
                  <span className="flex-1">{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
