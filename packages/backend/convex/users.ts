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
    mesuringSystem: v.optional(
      v.union(v.literal("metric"), v.literal("imperial"))
    ),
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
      mesuringSystem: user?.mesuringSystem,
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
    mesuringSystem: v.optional(
      v.union(v.literal("metric"), v.literal("imperial"))
    ),
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
        mesuringSystem: "metric" | "imperial";
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
      if (args.mesuringSystem !== undefined) {
        updateFields.mesuringSystem = args.mesuringSystem;
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

// New functions for onboarding flow
export const updateMeasuringSystem = mutation({
  args: {
    userId: v.string(),
    mesuringSystem: v.union(v.literal("metric"), v.literal("imperial")),
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
      mesuringSystem: args.mesuringSystem,
    });

    return null;
  },
});

export const createUserProfile = mutation({
  args: {
    userId: v.string(),
    platform: v.string(),
    mesuringSystem: v.optional(
      v.union(v.literal("metric"), v.literal("imperial"))
    ),
  },
  returns: v.id("userProfiles"),
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingProfile) {
      return existingProfile._id;
    }

    // Create new user profile with default values
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      platform: args.platform,
      onboardingComplete: false,
      fitnessLevel: "",
      goals: "",
      equipment: "",
      injuries: "",
      mesuringSystem: args.mesuringSystem || "metric",
    });

    return profileId;
  },
});

export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      userId: v.string(),
      platform: v.string(),
      onboardingComplete: v.boolean(),
      fitnessLevel: v.string(),
      goals: v.string(),
      equipment: v.string(),
      injuries: v.string(),
      mesuringSystem: v.union(v.literal("metric"), v.literal("imperial")),
      lastWorkoutDate: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    return profile || null;
  },
});

export const checkOnboardingStatus = query({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    hasProfile: v.boolean(),
    onboardingComplete: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    return {
      hasProfile: Boolean(profile),
      onboardingComplete: Boolean(profile?.onboardingComplete),
    };
  },
});
