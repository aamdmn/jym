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
