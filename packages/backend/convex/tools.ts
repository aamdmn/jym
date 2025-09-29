import { createTool, type ToolCtx } from "@convex-dev/agent";
import type { GenericDataModel } from "convex/server";
import { z } from "zod";
import { api, components, internal } from "./_generated/api";
import { createWorkoutAgent } from "./agents";

export const checkOnboardingTool = createTool({
  description: "Check if the user has completed onboarding questions",
  args: z.object({}),
  handler: async (ctx, _args, _options) => {
    // ctx has agent, userId, threadId, messageId
    // as well as ActionCtx properties like auth, storage, runMutation, and runAction
    if (!ctx.userId) {
      throw new Error("No userId available in context");
    }

    const onboardingInfo = await ctx.runQuery(api.users.getUserOnboardingInfo, {
      userId: ctx.userId,
    });
    console.log("found onboardingInfo for user", ctx.userId, onboardingInfo);
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
    console.log("updated onboarding for user", ctx.userId);
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
    console.log("completed onboarding for user", ctx.userId);
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
  handler: async (ctx, args, _options) => {
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
    const result = await ctx.runMutation(internal.triggers.createTrigger, {
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

    console.log(
      `Created trigger ${result.triggerId} for user ${ctx.userId} to run at ${new Date(
        args.runAt
      ).toISOString()}`
    );

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
  handler: async (ctx, args, _options) => {
    return {
      success: true,
    };
  },
});

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

// Simple workout generator (no AI needed for MVP)
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
  const workoutAgeent = createWorkoutAgent(ctx);

  /* 
  ++ This will need more details
  ++ Needs to also populate here all the excercises that are available with their slugs/ids 
  */
  const prompt = `
  Generate a workout for the user with ${energy} energy and ${additionalContext} additional context
  User's preferences: ${JSON.stringify(preferences)}
  `;

  const result = await workoutAgeent.generateObject(
    ctx,
    { threadId: ctx.threadId, userId: ctx.userId },
    {
      prompt,
      schema: z.object({
        exercises: z.array(
          z.object({
            name: z.string(),
            sets: z.number().optional(),
            reps: z.number().optional(),
            weight: z.number().optional(),
            duration: z.number().optional(),
            unit: z.string().optional(),
          })
        ),
      }),
    }
  );

  return result.object;
}

// Edit workout tool
