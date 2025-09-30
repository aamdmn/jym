"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

type Exercise = {
  name: string;
  slug: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  unit?: string;
  completed: boolean;
  feedback?: string;
};

type WorkoutCardProps = {
  exercises: Exercise[];
  currentExerciseIndex?: number;
  isActive?: boolean;
};

export default function WorkoutCard({
  exercises,
  currentExerciseIndex = 0,
  isActive = false,
}: WorkoutCardProps) {
  const formatExerciseDetails = (exercise: Exercise): string => {
    const parts: string[] = [];

    if (exercise.sets && exercise.reps) {
      parts.push(`${exercise.sets} × ${exercise.reps}`);
    } else if (exercise.reps) {
      parts.push(`${exercise.reps} reps`);
    }

    if (exercise.weight && exercise.unit) {
      parts.push(`${exercise.weight} ${exercise.unit}`);
    }

    if (exercise.duration) {
      const durationUnit = exercise.unit || "sec";
      parts.push(`${exercise.duration} ${durationUnit}`);
    }

    return parts.join(" • ");
  };

  const getBorderStyles = (isCurrent: boolean, isPast: boolean): string => {
    if (isCurrent) {
      return "border-primary bg-primary/5";
    }
    if (isPast) {
      return "border-gray-300 opacity-60";
    }
    return "border-gray-300";
  };

  // Split exercises into completed and upcoming
  const completedExercises = exercises.filter(
    (_, index) => isActive && index < currentExerciseIndex
  );
  const upcomingExercises = exercises.filter(
    (_, index) => !isActive || index >= currentExerciseIndex
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Completed exercises - collapsible */}
      {isActive && completedExercises.length > 0 && (
        <Accordion className="mb-1" collapsible type="single">
          <AccordionItem className="border-0" value="completed">
            <AccordionTrigger className="rounded-lg px-3 py-2 text-muted-foreground text-xs hover:bg-gray-50 hover:no-underline">
              {completedExercises.length} completed exercise
              {completedExercises.length !== 1 ? "s" : ""}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-0">
              <div className="flex flex-col gap-1.5">
                {completedExercises.map((exercise) => (
                  <Link
                    className="flex items-center gap-2 rounded-lg border border-gray-300 border-dashed bg-gray-50/50 px-3 py-2 opacity-70 transition-opacity hover:opacity-100"
                    href={`/ex/${exercise.slug}`}
                    key={exercise.slug}
                  >
                    <CheckCircle2
                      className="size-4 stroke-[1.5] text-primary"
                      strokeWidth={2}
                    />
                    <span className="flex-1 text-foreground text-sm">
                      {exercise.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatExerciseDetails(exercise)}
                    </span>
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Current and upcoming exercises */}
      <div className="flex flex-col gap-2">
        {upcomingExercises.map((exercise) => {
          const exerciseIndex = exercises.indexOf(exercise);
          const isCurrent = isActive && exerciseIndex === currentExerciseIndex;
          const isPast = isActive && exerciseIndex < currentExerciseIndex;

          return (
            <Link
              className={`flex items-start gap-2.5 rounded-lg border border-dashed p-3 transition-all hover:bg-muted/50 ${getBorderStyles(isCurrent, isPast)}`}
              href={`/ex/${exercise.slug}`}
              key={exercise.slug}
            >
              <div className="mt-0.5 flex-shrink-0">
                {exercise.completed || isPast ? (
                  <CheckCircle2
                    className="size-4 stroke-[1.5] text-primary"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Circle
                    className={`size-4 stroke-[1.5] ${isCurrent ? "text-primary" : "text-gray-400"}`}
                    strokeWidth={2.5}
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-foreground text-sm">
                    {exercise.name}
                  </h3>
                  {isCurrent && (
                    <Badge className="text-xs" variant="default">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatExerciseDetails(exercise)}
                </p>
                {exercise.feedback && (
                  <p className="mt-0.5 text-muted-foreground text-xs italic">
                    "{exercise.feedback}"
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
