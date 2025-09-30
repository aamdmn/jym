import { createTool, type ToolCtx } from "@convex-dev/agent";
import type { GenericDataModel } from "convex/server";
import { z } from "zod";
import { api, components, internal } from "./_generated/api";
import { createWorkoutAgent } from "./agents";

export const checkOnboardingTool = createTool({
  description: "Check if the user has completed onboarding questions",
  args: z.object({}),
  handler: async (
    ctx,
    _args,
    _options
  ): Promise<{
    onboardingComplete: boolean;
    fitnessLevel?: string;
    goals?: string;
    equipment?: string;
    injuries?: string;
  }> => {
    // ctx has agent, userId, threadId, messageId
    // as well as ActionCtx properties like auth, storage, runMutation, and runAction
    if (!ctx.userId) {
      throw new Error("No userId available in context");
    }

    const onboardingInfo: {
      onboardingComplete: boolean;
      fitnessLevel?: string;
      goals?: string;
      equipment?: string;
      injuries?: string;
    } = await ctx.runQuery(api.users.getUserOnboardingInfo, {
      userId: ctx.userId,
    });
    return onboardingInfo;
  },
});

export const updateOnboardingTool = createTool({
  description:
    "Update the onboarding information for the user. You can update one or more fields at a time.",
  args: z.object({
    fitnessLevel: z.string().optional(),
    goals: z.string().optional(),
    equipment: z.string().optional(),
    injuries: z.string().optional(),
  }),
  handler: async (ctx, args, _options) => {
    if (!ctx.userId) {
      throw new Error("No userId available in context");
    }

    await ctx.runMutation(api.users.updateOnboarding, {
      userId: ctx.userId,
      fitnessLevel: args.fitnessLevel,
      goals: args.goals,
      equipment: args.equipment,
      injuries: args.injuries,
    });
    return {
      success: true,
    };
  },
});

export const completeOnboardingTool = createTool({
  description: "Complete the onboarding process",
  args: z.object({}),

  handler: async (ctx, _args, _options) => {
    if (!ctx.userId) {
      throw new Error("No userId available in context");
    }

    await ctx.runMutation(api.users.completeOnboarding, {
      userId: ctx.userId,
    });
    return {
      success: true,
    };
  },
});

export const createTriggerTool = createTool({
  description:
    "Create a scheduled trigger/reminder to proactively check in with the user at a specific time. Use this when the user mentions they'll do something at a specific time (e.g., 'I'll go to the gym in 1 hour' or 'I'm working out tomorrow at 3pm'). The trigger will allow you to send a proactive message to the user at that time.",
  args: z.object({
    triggerMessage: z
      .string()
      .describe(
        "The internal message/context for the agent about what to check or remind about. This is NOT sent to the user directly - you will generate an appropriate message when the trigger fires. Example: 'User said they would go to the gym at this time - check if they made it and provide encouragement'"
      ),
    runAt: z
      .number()
      .describe(
        "The timestamp (milliseconds since epoch) when the trigger should fire. Calculate this from the current time plus the delay mentioned by the user."
      ),
    triggerType: z
      .string()
      .optional()
      .describe(
        "Optional type of trigger (e.g., 'workout_reminder', 'check_in', 'motivation')"
      ),
    additionalContext: z
      .string()
      .optional()
      .describe(
        "Optional additional context about the trigger (e.g., 'legs day', 'morning run')"
      ),
  }),
  handler: async (
    ctx,
    args,
    _options
  ): Promise<{
    success: boolean;
    triggerId: string;
    scheduledTime: string;
    message: string;
  }> => {
    if (!ctx.userId) {
      throw new Error("No userId available in context");
    }

    // Get the user's phone number from betterAuth
    const user = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "id", value: ctx.userId }],
    });

    if (!user?.phoneNumber) {
      throw new Error("User phone number not found");
    }

    // Create the trigger in the database and schedule it
    const result: { triggerId: string; scheduledFunctionId: string } =
      await ctx.runMutation(internal.triggers.createTrigger, {
        userId: ctx.userId,
        triggerMessage: args.triggerMessage,
        runAt: args.runAt,
        phoneNumber: user.phoneNumber,
        threadId: ctx.threadId, // Pass the current thread ID if available
        metadata: {
          type: args.triggerType,
          context: args.additionalContext,
        },
      });

    return {
      success: true,
      triggerId: result.triggerId,
      scheduledTime: new Date(args.runAt).toISOString(),
      message: `Reminder scheduled for ${new Date(args.runAt).toLocaleString()}`,
    };
  },
});

export const waitFunctionTool = createTool({
  description: "Use this tool if you don't want to do any action right now",
  args: z.object({}),
  handler: (_ctx, _args, _options): Promise<{ success: boolean }> => {
    return Promise.resolve({
      success: true,
    });
  },
});

// Helper function to get energy description
function getEnergyDescription(energy: number): string {
  if (energy <= 3) {
    return "(low energy - keep it short and light)";
  }
  if (energy <= 6) {
    return "(moderate energy - balanced workout)";
  }
  return "(high energy - can push harder)";
}

export const startWorkoutTool = createTool({
  description:
    "Generate and start a workout session based on user's energy and preferences",
  args: z.object({
    energyLevel: z
      .number()
      .min(1)
      .max(10)
      .describe("User's current energy level"),
    focusArea: z
      .string()
      .optional()
      .describe(
        "What to focus on, this will be different depending on the user's goals and fitness levels. An example: upper/lower/full"
      ),
    additionalContext: z
      .string()
      .optional()
      .describe("Optional additional context about the workout or the user"),
  }),
  handler: async (ctx, args) => {
    if (!ctx.userId) {
      throw new Error("No userId available in context");
    }

    // Get user profile
    const profile = await ctx.runQuery(api.users.getUserProfile, {
      userId: ctx.userId,
    });

    if (!profile) {
      throw new Error("User profile not found");
    }

    const preferences = {
      equipment: profile.equipment,
      injuries: profile.injuries,
      goals: profile.goals,
      focus: args.focusArea || undefined,
    };

    // Simple workout generation based on energy
    const exercises = await generateSimpleWorkout({
      ctx,
      energy: args.energyLevel,
      preferences,
      additionalContext: args.additionalContext || undefined,
    });

    // Store the workout in the database
    const workoutResult = await ctx.runMutation(api.workouts.createWorkout, {
      userId: ctx.userId,
      threadId: ctx.threadId,
      date: new Date().toISOString().split("T")[0],
      exercises,
    });

    // Return the excercises and the first exercise
    return {
      totalExercises: exercises.exercises.length,
      allExercises: exercises.exercises,
      firstExercise: exercises.exercises[0],
      workoutId: workoutResult._id,
    };
  },
});

async function generateSimpleWorkout({
  ctx,
  energy,
  preferences,
  additionalContext,
}: {
  ctx: ToolCtx<GenericDataModel>;
  energy: number;
  preferences: {
    equipment: string;
    injuries: string;
    goals: string;
    focus?: string;
  };
  additionalContext?: string;
}) {
  const workoutAgent = createWorkoutAgent(ctx);

  // Fetch all available exercises from the database
  const availableExercises = await ctx.runQuery(
    api.exercises.getExercisesForWorkout,
    {
      equipment: preferences.equipment,
    }
  );

  if (availableExercises.length === 0) {
    throw new Error(
      "No exercises available in the database for the given criteria"
    );
  }

  // Create a formatted list of exercises for the AI
  const exerciseList = availableExercises
    .map((ex) => {
      const equipment = ex.primaryEquipment
        ? `equipment: ${ex.primaryEquipment}`
        : "bodyweight";
      const difficulty = ex.difficulty || "N/A";
      return `- ${ex.name} (slug: "${ex.slug}", muscles: ${ex.primaryMuscles.join(", ")}, ${equipment}, difficulty: ${difficulty})`;
    })
    .join("\n");

  // Get valid slugs for validation
  const validSlugs = availableExercises.map((ex: { slug: string }) => ex.slug);

  const prompt = `
# Workout Generation Task

Generate a personalized workout based on the following parameters:

## User Parameters:
- Energy Level: ${energy}/10 ${getEnergyDescription(energy)}
- Goals: ${preferences.goals}
- Available Equipment: ${preferences.equipment}
- Injuries/Limitations: ${preferences.injuries}
${preferences.focus ? `- Focus Area: ${preferences.focus}` : ""}
${additionalContext ? `- Additional Context: ${additionalContext}` : ""}

## Guidelines:
1. **Duration**: Based on energy level
   - Low energy (1-3): 10-15 minutes, 3-4 exercises
   - Moderate energy (4-6): 20-30 minutes, 5-7 exercises
   - High energy (7-10): 30-45 minutes, 7-10 exercises

2. **Exercise Selection**: 
   - Start with a warmup exercise (like arm-circles, jumping-jacks, etc.)
   - Build a balanced workout targeting the requested muscle groups
   - Consider the user's equipment availability
   - Account for any injuries or limitations
   - End with a cool-down or stretch if appropriate

3. **Sets and Reps**:
   - Low energy: Lower volume (2-3 sets, 8-10 reps)
   - Moderate energy: Standard volume (3-4 sets, 10-12 reps)
   - High energy: Higher volume (4-5 sets, 12-15 reps)
   - For time-based exercises (planks, holds), adjust duration accordingly

4. **Exercise Progression**:
   - Order exercises logically (compound movements first, then isolation)
   - Alternate muscle groups to allow recovery
   - Consider fatigue accumulation

## CRITICAL: Available Exercises Database
You MUST ONLY use exercises from this list. Use the EXACT slug provided:

${exerciseList}

## Output Requirements:
- Return an array of exercises with EXACT slugs from the list above
- Include appropriate sets, reps, weight (if applicable), duration (for time-based), and unit
- Ensure the workout flows logically from warmup to main work to cooldown
- **VALIDATION**: Every slug you output MUST be from the available exercises list above

Generate a complete, balanced workout that matches the user's energy level and goals.
  `;

  const result = await workoutAgent.generateObject(
    ctx,
    { threadId: ctx.threadId, userId: ctx.userId },
    {
      prompt,
      schema: z.object({
        exercises: z.array(
          z.object({
            name: z.string().describe("The display name of the exercise"),
            slug: z
              .string()
              .describe(
                "MUST be an EXACT slug from the available exercises list (e.g., 'pushups', 'squats', 'incline-bench-press')"
              ),
            sets: z
              .number()
              .optional()
              .describe("Number of sets (omit for warmup/cooldown)"),
            reps: z
              .number()
              .optional()
              .describe(
                "Number of reps per set (omit for time-based exercises)"
              ),
            weight: z
              .number()
              .optional()
              .describe("Weight in lbs or kg if applicable"),
            duration: z
              .number()
              .optional()
              .describe("Duration in seconds for time-based exercises"),
            unit: z
              .string()
              .optional()
              .describe(
                "Unit of measurement (seconds, minutes, lbs, kg, etc.)"
              ),
          })
        ),
      }),
    }
  );

  // Validate that all generated slugs exist in the database
  const generatedSlugs = result.object.exercises.map((ex) => ex.slug);
  const invalidSlugs = generatedSlugs.filter(
    (slug) => !validSlugs.includes(slug)
  );

  if (invalidSlugs.length > 0) {
    throw new Error(
      `Workout generation failed: Invalid exercise slugs generated: ${invalidSlugs.join(", ")}. All exercises must exist in the database.`
    );
  }

  return result.object;
}

// Update workout tool

export const updateWorkoutTool = createTool({
  description:
    "Mark the current exercise as complete and advance to the next exercise. Use this when the user indicates they've finished an exercise. ALWAYS call this for EVERY completed exercise, including the last one.",
  args: z.object({
    slug: z
      .string()
      .describe(
        "The slug of the exercise to mark complete (e.g., 'pushups', 'squats', 'incline-bench-press')"
      ),
    feedback: z
      .string()
      .optional()
      .describe("Optional feedback from the user about the exercise"),
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      return { error: "No thread context available" };
    }

    // Get current exercise to verify it matches
    const currentExercise = await ctx.runQuery(
      api.workouts.getCurrentExercise,
      {
        threadId: ctx.threadId,
      }
    );

    if (!currentExercise) {
      return { error: "No active workout found" };
    }

    // Verify the slug matches the current exercise
    if (currentExercise.exercise.slug !== args.slug) {
      return {
        error: `Exercise mismatch. Current exercise is "${currentExercise.exercise.slug}", not "${args.slug}"`,
      };
    }

    // Mark the exercise complete and get next
    const result = await ctx.runMutation(api.workouts.markExerciseComplete, {
      workoutId: currentExercise.workoutId,
      exerciseIndex: currentExercise.exerciseIndex,
      feedback: args.feedback,
    });

    if (result.isWorkoutComplete) {
      return {
        complete: true,
        message: "All exercises completed! Workout is done!",
        progress: result.progress,
        isLastExercise: true,
      };
    }

    return {
      nextExercise: result.nextExercise,
      progress: result.progress,
      complete: false,
      isLastExercise: false,
    };
  },
});

export const completeWorkoutTool = createTool({
  description:
    "Explicitly mark the entire workout as complete. Use this as a safety check if the workout should be done but isn't marked complete, or if the user wants to end the workout early.",
  args: z.object({}),
  handler: async (ctx, _args) => {
    if (!ctx.threadId) {
      return { error: "No thread context available" };
    }

    const result = await ctx.runMutation(api.workouts.completeWorkout, {
      threadId: ctx.threadId,
    });

    if (!result.success) {
      return {
        error: result.message,
      };
    }

    return {
      success: true,
      message: result.message,
    };
  },
});

export const getCurrentExerciseTool = createTool({
  description:
    "Get the current exercise the user should be doing from their active workout. Use this to check what exercise is next in the flow.",
  args: z.object({}),
  handler: async (ctx, _args) => {
    if (!ctx.threadId) {
      return { error: "No thread context available" };
    }

    const currentExercise = await ctx.runQuery(
      api.workouts.getCurrentExercise,
      {
        threadId: ctx.threadId,
      }
    );

    if (!currentExercise) {
      return { error: "No active workout found" };
    }

    return {
      exercise: currentExercise.exercise,
      progress: currentExercise.progress,
    };
  },
});

export const editWorkoutTool = createTool({
  description:
    "Edit the current workout - modify exercise parameters (sets/reps/weight), replace exercises, add new exercises, or remove exercises. Use this when the user requests changes or adjustments to their workout.",
  args: z.object({
    action: z
      .enum([
        "modify_exercise",
        "replace_exercise",
        "remove_exercise",
        "add_exercise",
      ])
      .describe(
        "The type of edit to perform: modify_exercise (change sets/reps/weight), replace_exercise (swap one exercise for another), remove_exercise (delete an exercise), add_exercise (insert a new exercise)"
      ),
    exerciseSlug: z
      .string()
      .optional()
      .describe(
        "The slug of the exercise to modify/replace/remove (required for all actions except add_exercise)"
      ),
    modifications: z
      .object({
        sets: z.number().optional(),
        reps: z.number().optional(),
        weight: z.number().optional(),
        duration: z.number().optional(),
        unit: z.string().optional(),
      })
      .optional()
      .describe(
        "For modify_exercise: the parameters to update (only provide the ones that should change)"
      ),
    newExercise: z
      .object({
        name: z.string(),
        slug: z.string(),
        sets: z.number().optional(),
        reps: z.number().optional(),
        weight: z.number().optional(),
        duration: z.number().optional(),
        unit: z.string().optional(),
      })
      .optional()
      .describe(
        "For replace_exercise or add_exercise: the new exercise details"
      ),
    insertPosition: z
      .number()
      .optional()
      .describe(
        "For add_exercise: the index position where to insert the exercise (0 = beginning, undefined = end)"
      ),
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      return { error: "No thread context available" };
    }

    const result = await ctx.runMutation(api.workouts.editWorkout, {
      threadId: ctx.threadId,
      action: args.action,
      exerciseSlug: args.exerciseSlug,
      modifications: args.modifications,
      newExercise: args.newExercise,
      insertPosition: args.insertPosition,
    });

    if (!result.success) {
      return {
        error: result.message,
      };
    }

    return {
      success: true,
      message: result.message,
      updatedExercises: result.updatedExercises,
    };
  },
});
