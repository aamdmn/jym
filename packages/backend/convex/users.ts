import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUserOnboardingInfo = query({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    onboardingComplete: v.optional(v.boolean()),
    fitnessLevel: v.optional(v.string()),
    goals: v.optional(v.string()),
    equipment: v.optional(v.string()),
    injuries: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const onboardingInfo = {
      onboardingComplete: user?.onboardingComplete,
      fitnessLevel: user?.fitnessLevel,
      goals: user?.goals,
      equipment: user?.equipment,
      injuries: user?.injuries,
    };

    return onboardingInfo;
  },
});

export const updateOnboarding = mutation({
  args: {
    userId: v.string(),
    fitnessLevel: v.optional(v.string()),
    goals: v.optional(v.string()),
    equipment: v.optional(v.string()),
    injuries: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("userProfiles")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();

      if (!user) {
        throw new Error("User not found");
      }

      // Only patch fields that are actually provided (not undefined)
      const updateFields: Partial<{
        fitnessLevel: string;
        goals: string;
        equipment: string;
        injuries: string;
      }> = {};

      if (args.fitnessLevel !== undefined) {
        updateFields.fitnessLevel = args.fitnessLevel;
      }
      if (args.goals !== undefined) {
        updateFields.goals = args.goals;
      }
      if (args.equipment !== undefined) {
        updateFields.equipment = args.equipment;
      }
      if (args.injuries !== undefined) {
        updateFields.injuries = args.injuries;
      }

      // Only patch if we have fields to update
      if (Object.keys(updateFields).length > 0) {
        await ctx.db.patch(user._id, updateFields);
      }

      return; // Success case returns undefined
    } catch (error) {
      console.error("Error updating onboarding", error);
      return {
        success: false,
        error:
          "There was an error updating the onboarding information, please try again.",
      };
    }
  },
});

export const completeOnboarding = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingComplete: true,
    });

    return null;
  },
});
