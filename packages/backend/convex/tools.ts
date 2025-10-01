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

// Diagnostic tool to check user readiness for workout generation
export const checkUserReadiness = createTool({
  description: "Check if user is authenticated and ready to start a workout",
  args: z.object({}),
  handler: async (
    ctx,
    _args,
    _options
  ): Promise<{
    authenticated: boolean;
    hasProfile: boolean;
    onboardingComplete: boolean;
    ready: boolean;
    message: string;
  }> => {
    console.log("[checkUserReadiness] Checking user readiness...");

    // Check authentication
    if (!ctx.userId) {
      console.log("[checkUserReadiness] User not authenticated");
      return {
        authenticated: false,
        hasProfile: false,
        onboardingComplete: false,
        ready: false,
        message: "User is not authenticated. Please log in first.",
      };
    }

    // Check profile exists
    let profile;
    try {
      profile = await ctx.runQuery(api.users.getUserProfile, {
        userId: ctx.userId,
      });
    } catch (error) {
      console.error("[checkUserReadiness] Error fetching profile:", error);
      return {
        authenticated: true,
        hasProfile: false,
        onboardingComplete: false,
        ready: false,
        message: "Error fetching user profile. Please try again.",
      };
    }

    if (!profile) {
      console.log("[checkUserReadiness] Profile not found");
      return {
        authenticated: true,
        hasProfile: false,
        onboardingComplete: false,
        ready: false,
        message: "User profile not found. Please complete onboarding.",
      };
    }

    // Check onboarding status
    if (!profile.onboardingComplete) {
      console.log("[checkUserReadiness] Onboarding not complete");
      return {
        authenticated: true,
        hasProfile: true,
        onboardingComplete: false,
        ready: false,
        message: "Onboarding not complete. Please complete onboarding first.",
      };
    }

    console.log("[checkUserReadiness] User is ready!");
    return {
      authenticated: true,
      hasProfile: true,
      onboardingComplete: true,
      ready: true,
      message: "User is ready to start workout generation!",
    };
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
    console.log("[startWorkout] Starting workout generation", {
      userId: ctx.userId,
      energyLevel: args.energyLevel,
      focusArea: args.focusArea,
      threadId: ctx.threadId,
    });

    // Critical: Check if user is authenticated
    if (!ctx.userId) {
      console.error(
        "[startWorkout] ERROR: No userId in context - user not authenticated"
      );
      throw new Error(
        "Authentication required: Please log in to generate workouts"
      );
    }

    // Get user profile
    console.log("[startWorkout] Fetching user profile for userId:", ctx.userId);
    let profile;
    try {
      profile = await ctx.runQuery(api.users.getUserProfile, {
        userId: ctx.userId,
      });
    } catch (error) {
      console.error("[startWorkout] Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile. Please try again.");
    }

    if (!profile) {
      console.error(
        "[startWorkout] User profile not found for userId:",
        ctx.userId
      );
      throw new Error(
        "User profile not found. Please complete onboarding first."
      );
    }

    // Check if onboarding is complete
    if (!profile.onboardingComplete) {
      console.error("[startWorkout] User has not completed onboarding");
      throw new Error("Please complete onboarding before starting a workout");
    }

    console.log("[startWorkout] User profile loaded successfully:", {
      equipment: profile.equipment,
      goals: profile.goals,
      injuries: profile.injuries,
      measuringSystem: profile.mesuringSystem,
      onboardingComplete: profile.onboardingComplete,
    });

    const preferences = {
      equipment: profile.equipment,
      injuries: profile.injuries,
      goals: profile.goals,
      measuringSystem: profile.mesuringSystem || "metric",
      focus: args.focusArea || undefined,
    };

    // Simple workout generation based on energy
    console.log(
      "[startWorkout] Generating workout with preferences:",
      preferences
    );

    let exercises;
    try {
      exercises = await generateSimpleWorkout({
        ctx,
        energy: args.energyLevel,
        preferences,
        additionalContext: args.additionalContext || undefined,
      });
      console.log("[startWorkout] Workout generated successfully:", {
        exerciseCount: exercises.exercises.length,
        exercises: exercises.exercises.map(
          (e: { name: string; slug: string }) => ({
            name: e.name,
            slug: e.slug,
          })
        ),
      });
    } catch (error) {
      console.error("[startWorkout] Error generating workout:", error);
      throw error;
    }

    // Store the workout in the database
    console.log("[startWorkout] Storing workout in database...");
    const workoutResult = await ctx.runMutation(api.workouts.createWorkout, {
      userId: ctx.userId,
      threadId: ctx.threadId,
      date: new Date().toISOString().split("T")[0],
      exercises,
    });

    console.log("[startWorkout] Workout stored with ID:", workoutResult._id);

    // Return the exercises and the first exercise with clear instructions
    return {
      totalExercises: exercises.exercises.length,
      firstExercise: exercises.exercises[0],
      workoutId: workoutResult._id,
      // Add explicit instruction for the agent
      agentInstruction:
        "Present ONLY the firstExercise to user with the exact name, sets/reps, and slug provided. Include the link: https://jym.coach/ex/" +
        exercises.exercises[0].slug,
      nextStep:
        "Wait for user to say 'done' then call updateWorkout with slug: " +
        exercises.exercises[0].slug,
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
    measuringSystem: "metric" | "imperial";
    focus?: string;
  };
  additionalContext?: string;
}) {
  console.log("[generateSimpleWorkout] Starting workout generation", {
    energy,
    preferences,
    additionalContext,
  });

  const workoutAgent = createWorkoutAgent(ctx);

  // Fetch all available exercises from the database
  console.log(
    "[generateSimpleWorkout] Fetching exercises from database with equipment:",
    preferences.equipment
  );

  let availableExercises = await ctx.runQuery(
    api.exercises.getExercisesForWorkout,
    {
      equipment: preferences.equipment,
    }
  );

  console.log(
    "[generateSimpleWorkout] Fetched exercises with equipment filter:",
    {
      count: availableExercises.length,
      sample: availableExercises
        .slice(0, 5)
        .map((e: { name: string; slug: string }) => ({
          name: e.name,
          slug: e.slug,
        })),
    }
  );

  // Fallback: if no exercises found with equipment filter, fetch all exercises
  if (availableExercises.length === 0) {
    console.warn(
      "[generateSimpleWorkout] No exercises found with equipment filter, fetching all exercises..."
    );
    availableExercises = await ctx.runQuery(
      api.exercises.getExercisesForWorkout,
      {}
    );
    console.log("[generateSimpleWorkout] Fetched all exercises (no filter):", {
      count: availableExercises.length,
    });
  }

  if (availableExercises.length === 0) {
    console.error(
      "[generateSimpleWorkout] No exercises found in database at all!"
    );
    throw new Error(
      "No exercises available in the database. Please add exercises first."
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

  const weightUnit = preferences.measuringSystem === "metric" ? "kg" : "lbs";
  const timeUnit = "seconds";

  const prompt = `
# Workout Generation Task

Generate a personalized workout based on the following parameters:

## User Parameters:
- Energy Level: ${energy}/10 ${getEnergyDescription(energy)}
- Goals: ${preferences.goals}
- Available Equipment: ${preferences.equipment}
- Injuries/Limitations: ${preferences.injuries}
- Measuring System: ${preferences.measuringSystem} (use ${weightUnit} for weights)
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

5. **CRITICAL - Units**:
   - User's measuring system: ${preferences.measuringSystem}
   - All weights MUST be in ${weightUnit}
   - Time-based exercises (planks, holds) should use seconds
   - Always include the unit field: "${weightUnit}" for weights, "${timeUnit}" for time-based

## CRITICAL: Available Exercises Database
You MUST ONLY use exercises from this list. Use the EXACT slug provided:

${exerciseList}

## Output Requirements:
- Return an array of exercises with EXACT slugs from the list above
- Include appropriate sets, reps, weight (if applicable), duration (for time-based), and unit
- **ALL weights must be in ${weightUnit}** (user's measuring system is ${preferences.measuringSystem})
- **ALL time-based exercises must use seconds**
- Always include the unit field with the correct value
- Ensure the workout flows logically from warmup to main work to cooldown
- **VALIDATION**: Every slug you output MUST be from the available exercises list above

Generate a complete, balanced workout that matches the user's energy level and goals.
  `;

  console.log("[generateSimpleWorkout] Calling AI to generate workout...");
  console.log("[generateSimpleWorkout] Prompt length:", prompt.length);
  console.log(
    "[generateSimpleWorkout] Available exercise count:",
    availableExercises.length
  );

  let result;
  try {
    // Add timeout to prevent infinite hanging
    const timeoutMs = 30_000; // 30 seconds timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error("Workout generation timed out after 30 seconds")),
        timeoutMs
      )
    );

    const generationPromise = workoutAgent.generateObject(
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
                .describe(
                  `Weight if applicable - MUST be in ${weightUnit} (user's measuring system is ${preferences.measuringSystem})`
                ),
              duration: z
                .number()
                .optional()
                .describe("Duration in seconds for time-based exercises"),
              unit: z
                .string()
                .optional()
                .describe(
                  `Unit of measurement - use "${weightUnit}" for weights or "seconds" for time-based exercises`
                ),
            })
          ),
        }),
      }
    );

    result = await Promise.race([generationPromise, timeoutPromise]);
    console.log("[generateSimpleWorkout] AI generation completed successfully");
    console.log(
      "[generateSimpleWorkout] Generated exercises count:",
      result.object.exercises.length
    );
  } catch (error) {
    console.error("[generateSimpleWorkout] Error during AI generation:", error);
    console.error("[generateSimpleWorkout] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new Error(
          "Workout generation took too long. Please try again with simpler preferences."
        );
      }
      if (
        error.message.includes("API") ||
        error.message.includes("rate limit")
      ) {
        throw new Error(
          "Service temporarily unavailable. Please try again in a moment."
        );
      }
    }

    throw new Error(
      `Failed to generate workout: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Validate that all generated slugs exist in the database
  console.log("[generateSimpleWorkout] Validating generated exercise slugs...");
  const generatedSlugs = result.object.exercises.map(
    (ex: { slug: string }) => ex.slug
  );
  console.log("[generateSimpleWorkout] Generated slugs:", generatedSlugs);

  const invalidSlugs = generatedSlugs.filter(
    (slug: string) => !validSlugs.includes(slug)
  );

  if (invalidSlugs.length > 0) {
    console.error(
      "[generateSimpleWorkout] Validation failed - invalid slugs:",
      invalidSlugs
    );
    console.error(
      "[generateSimpleWorkout] Valid slugs sample (first 10):",
      validSlugs.slice(0, 10)
    );
    throw new Error(
      `Workout generation failed: Invalid exercise slugs generated: ${invalidSlugs.join(", ")}. All exercises must exist in the database.`
    );
  }

  console.log(
    "[generateSimpleWorkout] Validation passed - all slugs are valid"
  );
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
        agentInstruction:
          "Workout is complete. Congratulate user briefly and ask how they feel.",
      };
    }

    return {
      nextExercise: result.nextExercise,
      progress: result.progress,
      complete: false,
      isLastExercise: false,
      // Add explicit instruction for the agent
      agentInstruction:
        "Present ONLY the nextExercise to user with the exact name, sets/reps, and slug provided. Include the link: https://jym.coach/ex/" +
        result.nextExercise.slug,
      nextStep:
        "Wait for user to say 'done' then call updateWorkout with slug: " +
        result.nextExercise.slug,
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
