import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "./_generated/api";

export const checkOnboardingTool = createTool({
  description: "Check if the user has completed onboarding questions",
  args: z.object({
    userId: z
      .string()
      .optional()
      .describe(
        "The user ID (or phone number) to check onboarding for. If not provided, uses the current context userId"
      ),
  }),
  handler: async (ctx, args, _options) => {
    // ctx has agent, userId, threadId, messageId
    // as well as ActionCtx properties like auth, storage, runMutation, and runAction
    const userId = args.userId || ctx.userId;
    if (!userId) {
      throw new Error("No userId provided in args or context");
    }

    const onboardingInfo = await ctx.runQuery(api.users.getUserOnboardingInfo, {
      userId,
    });
    console.log("found onboardingInfo for user", userId, onboardingInfo);
    return onboardingInfo;
  },
});

export const updateOnboardingTool = createTool({
  description:
    "Update the onboarding information for the user. You can update one or more fields at a time.",
  args: z.object({
    userId: z
      .string()
      .optional()
      .describe(
        "The user ID (or phone number) to update onboarding for. If not provided, uses the current context userId"
      ),
    fitnessLevel: z.string().optional(),
    goals: z.string().optional(),
    equipment: z.string().optional(),
    injuries: z.string().optional(),
  }),
  handler: async (ctx, args, _options) => {
    const userId = args.userId || ctx.userId;
    if (!userId) {
      throw new Error("No userId provided in args or context");
    }

    await ctx.runMutation(api.users.updateOnboarding, {
      userId,
      fitnessLevel: args.fitnessLevel,
      goals: args.goals,
      equipment: args.equipment,
      injuries: args.injuries,
    });
    console.log("updated onboarding for user", userId);
    return {
      success: true,
    };
  },
});

export const completeOnboardingTool = createTool({
  description: "Complete the onboarding process",
  args: z.object({
    userId: z
      .string()
      .optional()
      .describe(
        "The user ID (or phone number) to complete onboarding for. If not provided, uses the current context userId"
      ),
  }),
  handler: async (ctx, args, _options) => {
    const userId = args.userId || ctx.userId;
    if (!userId) {
      throw new Error("No userId provided in args or context");
    }

    await ctx.runMutation(api.users.completeOnboarding, {
      userId,
    });
    console.log("completed onboarding for user", userId);
    return {
      success: true,
    };
  },
});
