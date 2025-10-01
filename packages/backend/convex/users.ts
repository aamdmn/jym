import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

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
    } catch {
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
    telegramId: v.optional(v.number()),
  },
  returns: v.id("userProfiles"),
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingProfile) {
      // If telegram ID provided, update it
      if (args.telegramId !== undefined) {
        await ctx.db.patch(existingProfile._id, {
          telegramId: args.telegramId,
          platform: args.platform,
        });
      }
      return existingProfile._id;
    }

    // Create new user profile with default values
    const profileId = await ctx.db.insert("userProfiles", {
      userId: args.userId,
      telegramId: args.telegramId,
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

/**
 * Link Telegram ID directly to userProfile
 * Called after successful Telegram widget authentication
 */
export const linkTelegramToProfile = mutation({
  args: {
    userId: v.string(),
    telegramId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const { userId, telegramId, username, firstName, lastName } = args;

      console.log(`Linking Telegram ID ${telegramId} to user ${userId}`);

      // Check if this Telegram ID is already linked to a different user
      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_telegram_id")
        .filter((q) => q.eq(q.field("telegramId"), telegramId))
        .first();

      if (existingProfile && existingProfile.userId !== userId) {
        return {
          success: false,
          message: "This Telegram account is already linked to another user",
        };
      }

      // Find or create user profile
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();

      if (userProfile) {
        // Update existing profile
        await ctx.db.patch(userProfile._id, {
          telegramId,
          platform: "telegram",
        });
        console.log(`Updated existing profile for user ${userId}`);
      } else {
        // Create new profile
        await ctx.db.insert("userProfiles", {
          userId,
          telegramId,
          platform: "telegram",
          onboardingComplete: false,
          fitnessLevel: "",
          goals: "",
          equipment: "",
          injuries: "",
          mesuringSystem: "metric",
        });
        console.log(`Created new profile for user ${userId}`);
      }

      const displayName = firstName || username || `User ${telegramId}`;

      return {
        success: true,
        message: `Telegram account linked successfully for ${displayName}!`,
      };
    } catch (error) {
      console.error("Error linking Telegram to profile:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to link Telegram account",
      };
    }
  },
});

export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("userProfiles"),
      _creationTime: v.number(), // System field that Convex adds automatically
      userId: v.string(),
      telegramId: v.optional(v.number()), // Added for Telegram integration
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

export const deleteAccount = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user?._id) {
      throw new Error("User not authenticated");
    }

    const userId = user._id;

    try {
      // Delete user profile
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();

      if (userProfile) {
        await ctx.db.delete(userProfile._id);
      }

      // Delete all workouts
      const workouts = await ctx.db
        .query("workouts")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      for (const workout of workouts) {
        await ctx.db.delete(workout._id);
      }

      // Delete all triggers
      const triggers = await ctx.db
        .query("triggers")
        .withIndex("by_user")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      for (const trigger of triggers) {
        await ctx.db.delete(trigger._id);
      }

      // Delete the BetterAuth user (this will also delete sessions, accounts, etc.)
      await ctx.runMutation(components.betterAuth.lib.deleteOne, {
        model: "user",
        where: [{ field: "id", value: userId }],
      });

      return {
        success: true,
        message: "Account deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete account. Please try again.",
      };
    }
  },
});
