import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api } from "./_generated/api";

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
