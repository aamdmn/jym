import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createWorkout = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    date: v.string(),
    exercises: v.object({
      exercises: v.array(
        v.object({
          name: v.string(),
          slug: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.number()),
          weight: v.optional(v.number()),
          duration: v.optional(v.number()),
          unit: v.optional(v.string()),
        })
      ),
    }),
  },
  returns: v.object({
    _id: v.id("workouts"),
  }),
  handler: async (ctx, args) => {
    // Convert the exercise format and add completed status
    const exercisesWithStatus = args.exercises.exercises.map((exercise) => ({
      ...exercise,
      completed: false,
      feedback: undefined,
    }));

    const workoutId = await ctx.db.insert("workouts", {
      userId: args.userId,
      threadId: args.threadId,
      date: args.date,
      exercises: exercisesWithStatus,
      completed: false,
      currentExerciseIndex: 0, // Start with first exercise
    });

    return { _id: workoutId };
  },
});

export const getCurrentWorkout = query({
  args: { threadId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("workouts"),
      _creationTime: v.number(),
      userId: v.string(),
      threadId: v.string(),
      date: v.string(),
      exercises: v.array(
        v.object({
          name: v.string(),
          slug: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.number()),
          weight: v.optional(v.number()),
          duration: v.optional(v.number()),
          unit: v.optional(v.string()),
          completed: v.boolean(),
          feedback: v.optional(v.string()),
        })
      ),
      completed: v.boolean(),
      currentExerciseIndex: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("completed"), false))
      .first();
  },
});

export const getCurrentExercise = query({
  args: { threadId: v.string() },
  returns: v.union(
    v.object({
      exercise: v.object({
        name: v.string(),
        slug: v.string(),
        sets: v.optional(v.number()),
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        unit: v.optional(v.string()),
        completed: v.boolean(),
        feedback: v.optional(v.string()),
      }),
      workoutId: v.id("workouts"),
      exerciseIndex: v.number(),
      progress: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("completed"), false))
      .first();

    if (!workout || workout.currentExerciseIndex >= workout.exercises.length) {
      return null;
    }

    const currentExercise = workout.exercises[workout.currentExerciseIndex];

    return {
      exercise: currentExercise,
      workoutId: workout._id,
      exerciseIndex: workout.currentExerciseIndex,
      progress: `${workout.currentExerciseIndex + 1}/${workout.exercises.length}`,
    };
  },
});

export const markExerciseComplete = mutation({
  args: {
    workoutId: v.id("workouts"),
    exerciseIndex: v.number(),
    feedback: v.optional(v.string()),
  },
  returns: v.object({
    nextExercise: v.optional(
      v.object({
        name: v.string(),
        slug: v.string(),
        sets: v.optional(v.number()),
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        unit: v.optional(v.string()),
        completed: v.boolean(),
        feedback: v.optional(v.string()),
      })
    ),
    isWorkoutComplete: v.boolean(),
    progress: v.string(),
  }),
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    // Mark current exercise as complete
    workout.exercises[args.exerciseIndex].completed = true;
    if (args.feedback) {
      workout.exercises[args.exerciseIndex].feedback = args.feedback;
    }

    // Move to next exercise
    const nextExerciseIndex = args.exerciseIndex + 1;
    const isWorkoutComplete = nextExerciseIndex >= workout.exercises.length;

    // Check if all exercises are complete
    const allComplete = workout.exercises.every((ex) => ex.completed);

    await ctx.db.patch(args.workoutId, {
      exercises: workout.exercises,
      currentExerciseIndex: isWorkoutComplete
        ? workout.exercises.length
        : nextExerciseIndex,
      completed: allComplete,
    });

    return {
      nextExercise: isWorkoutComplete
        ? undefined
        : workout.exercises[nextExerciseIndex],
      isWorkoutComplete,
      progress: `${nextExerciseIndex}/${workout.exercises.length}`,
    };
  },
});

export const getActiveWorkoutByUserId = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("workouts"),
      _creationTime: v.number(),
      userId: v.string(),
      threadId: v.string(),
      date: v.string(),
      exercises: v.array(
        v.object({
          name: v.string(),
          slug: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.number()),
          weight: v.optional(v.number()),
          duration: v.optional(v.number()),
          unit: v.optional(v.string()),
          completed: v.boolean(),
          feedback: v.optional(v.string()),
        })
      ),
      completed: v.boolean(),
      currentExerciseIndex: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("completed", false)
      )
      .first();

    return workout || null;
  },
});

export const getLastWorkoutByUserId = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("workouts"),
      _creationTime: v.number(),
      userId: v.string(),
      threadId: v.string(),
      date: v.string(),
      exercises: v.array(
        v.object({
          name: v.string(),
          slug: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.number()),
          weight: v.optional(v.number()),
          duration: v.optional(v.number()),
          unit: v.optional(v.string()),
          completed: v.boolean(),
          feedback: v.optional(v.string()),
        })
      ),
      completed: v.boolean(),
      currentExerciseIndex: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    return workout || null;
  },
});

export const completeWorkout = mutation({
  args: {
    threadId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("completed"), false))
      .first();

    if (!workout) {
      return {
        success: false,
        message: "No active workout found",
      };
    }

    // Mark all exercises as complete if they aren't already
    const exercises = workout.exercises.map((ex) => ({
      ...ex,
      completed: true,
    }));

    // Mark workout as complete
    await ctx.db.patch(workout._id, {
      exercises,
      completed: true,
      currentExerciseIndex: workout.exercises.length,
    });

    return {
      success: true,
      message: "Workout completed successfully",
    };
  },
});

export const editWorkout = mutation({
  args: {
    threadId: v.string(),
    action: v.union(
      v.literal("modify_exercise"),
      v.literal("replace_exercise"),
      v.literal("remove_exercise"),
      v.literal("add_exercise")
    ),
    exerciseSlug: v.optional(v.string()),
    modifications: v.optional(
      v.object({
        sets: v.optional(v.number()),
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        unit: v.optional(v.string()),
      })
    ),
    newExercise: v.optional(
      v.object({
        name: v.string(),
        slug: v.string(),
        sets: v.optional(v.number()),
        reps: v.optional(v.number()),
        weight: v.optional(v.number()),
        duration: v.optional(v.number()),
        unit: v.optional(v.string()),
      })
    ),
    insertPosition: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    updatedExercises: v.optional(
      v.array(
        v.object({
          name: v.string(),
          slug: v.string(),
          sets: v.optional(v.number()),
          reps: v.optional(v.number()),
          weight: v.optional(v.number()),
          duration: v.optional(v.number()),
          unit: v.optional(v.string()),
          completed: v.boolean(),
          feedback: v.optional(v.string()),
        })
      )
    ),
  }),
  handler: async (ctx, args) => {
    // Get the active workout
    const workout = await ctx.db
      .query("workouts")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .filter((q) => q.eq(q.field("completed"), false))
      .first();

    if (!workout) {
      return {
        success: false,
        message: "No active workout found",
      };
    }

    const exercises = [...workout.exercises];

    switch (args.action) {
      case "modify_exercise": {
        if (!(args.exerciseSlug && args.modifications)) {
          return {
            success: false,
            message: "Exercise slug and modifications are required",
          };
        }

        const exerciseIndex = exercises.findIndex(
          (ex) => ex.slug === args.exerciseSlug
        );

        if (exerciseIndex === -1) {
          return {
            success: false,
            message: `Exercise "${args.exerciseSlug}" not found in workout`,
          };
        }

        // Apply modifications
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          ...args.modifications,
        };

        await ctx.db.patch(workout._id, { exercises });

        return {
          success: true,
          message: `Modified ${exercises[exerciseIndex].name}`,
          updatedExercises: exercises,
        };
      }

      case "replace_exercise": {
        if (!(args.exerciseSlug && args.newExercise)) {
          return {
            success: false,
            message: "Exercise slug and new exercise are required",
          };
        }

        const exerciseIndex = exercises.findIndex(
          (ex) => ex.slug === args.exerciseSlug
        );

        if (exerciseIndex === -1) {
          return {
            success: false,
            message: `Exercise "${args.exerciseSlug}" not found in workout`,
          };
        }

        // Replace the exercise
        exercises[exerciseIndex] = {
          ...args.newExercise,
          completed: false,
          feedback: undefined,
        };

        await ctx.db.patch(workout._id, { exercises });

        return {
          success: true,
          message: `Replaced with ${args.newExercise.name}`,
          updatedExercises: exercises,
        };
      }

      case "remove_exercise": {
        if (!args.exerciseSlug) {
          return {
            success: false,
            message: "Exercise slug is required",
          };
        }

        const exerciseIndex = exercises.findIndex(
          (ex) => ex.slug === args.exerciseSlug
        );

        if (exerciseIndex === -1) {
          return {
            success: false,
            message: `Exercise "${args.exerciseSlug}" not found in workout`,
          };
        }

        const removedExercise = exercises[exerciseIndex];

        // Remove the exercise
        exercises.splice(exerciseIndex, 1);

        // Adjust currentExerciseIndex if needed
        let newCurrentIndex = workout.currentExerciseIndex;
        if (exerciseIndex < workout.currentExerciseIndex) {
          newCurrentIndex = Math.max(0, workout.currentExerciseIndex - 1);
        } else if (exerciseIndex === workout.currentExerciseIndex) {
          // If removing current exercise, stay at same index (which becomes next exercise)
          newCurrentIndex = workout.currentExerciseIndex;
        }

        await ctx.db.patch(workout._id, {
          exercises,
          currentExerciseIndex: newCurrentIndex,
        });

        return {
          success: true,
          message: `Removed ${removedExercise.name}`,
          updatedExercises: exercises,
        };
      }

      case "add_exercise": {
        if (!args.newExercise) {
          return {
            success: false,
            message: "New exercise is required",
          };
        }

        const insertPosition =
          args.insertPosition !== undefined
            ? args.insertPosition
            : exercises.length;

        // Add the exercise at the specified position
        exercises.splice(insertPosition, 0, {
          ...args.newExercise,
          completed: false,
          feedback: undefined,
        });

        // Adjust currentExerciseIndex if inserting before current position
        let newCurrentIndex = workout.currentExerciseIndex;
        if (insertPosition <= workout.currentExerciseIndex) {
          newCurrentIndex = workout.currentExerciseIndex + 1;
        }

        await ctx.db.patch(workout._id, {
          exercises,
          currentExerciseIndex: newCurrentIndex,
        });

        return {
          success: true,
          message: `Added ${args.newExercise.name}`,
          updatedExercises: exercises,
        };
      }

      default:
        return {
          success: false,
          message: "Invalid action",
        };
    }
  },
});
