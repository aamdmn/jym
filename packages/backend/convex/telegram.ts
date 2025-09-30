import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import { action, internalAction, internalMutation } from "./_generated/server";
import { createJymAgent, createOnboardingAgent } from "./agents";

/**
 * Process incoming Telegram message
 * Similar to SMS/LoopMessage flow but uses telegram ID for identification
 */
export const processIncomingMessage = internalMutation({
  args: {
    telegramId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    messageText: v.string(),
    messageId: v.number(),
  },
  returns: v.object({
    shouldRespond: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const {
      telegramId,
      username,
      firstName,
      lastName,
      messageText,
      messageId,
    } = args;

    console.log(
      `Processing Telegram message from ${username || telegramId}: ${messageText}`
    );
    console.log(`Message ID: ${messageId}`);

    // Check if user exists by telegram ID in userProfiles
    let userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_telegram_id")
      .filter((q) => q.eq(q.field("telegramId"), telegramId))
      .first();

    // If profile exists, get the betterAuth user
    let user = null;
    if (userProfile) {
      user = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "user",
        where: [{ field: "id", value: userProfile.userId }],
      });
    }

    if (!user?._id) {
      console.log(
        `User with telegram ID ${telegramId} not found or not authenticated`
      );

      // Send login message for unauthenticated users
      await ctx.scheduler.runAfter(0, internal.telegram.sendMessage, {
        telegramId,
        message:
          "hello human! 👋 before we start please login and connect your telegram:\n\nhttps://jym.coach/login",
      });

      return { shouldRespond: true };
    }

    // If userProfile doesn't exist but user exists, create it
    if (!userProfile) {
      console.log(`Creating new userProfile for telegram user ${telegramId}`);

      const profileId = await ctx.db.insert("userProfiles", {
        userId: user._id,
        telegramId,
        platform: "telegram",
        onboardingComplete: false,
        fitnessLevel: "",
        goals: "",
        equipment: "",
        injuries: "",
        mesuringSystem: "metric", // Default to metric
      });
      userProfile = await ctx.db.get(profileId);
    }

    console.log(
      `Found authenticated user: ${user._id} for telegram ${telegramId}, profile: ${userProfile?._id}`
    );

    // Schedule response generation with the authenticated user ID
    await ctx.scheduler.runAfter(0, internal.telegram.generateResponse, {
      userId: user._id,
      telegramId,
      messageText,
      messageId,
      username: username || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });

    return { shouldRespond: true };
  },
});

/**
 * Generate response using Jym agent with thread context
 * Returns the response messages so the bot can send them
 */
export const generateResponse = internalAction({
  args: {
    userId: v.string(),
    telegramId: v.number(),
    messageText: v.string(),
    messageId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    messages: v.array(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { userId, telegramId, messageText, messageId } = args;

    try {
      // Find existing thread for this user or create a new one
      const existingThreads = await ctx.runQuery(
        components.agent.threads.listThreadsByUserId,
        {
          userId,
          paginationOpts: { numItems: 1, cursor: null },
        }
      );

      let threadId: string;

      if (existingThreads.page.length > 0) {
        threadId = existingThreads.page[0]._id;
        console.log(`Using existing thread: ${threadId}`);
      } else {
        // Create new thread
        threadId = await createThread(ctx, components.agent, {
          userId,
          title: `Telegram chat with ${args.username || telegramId}`,
          summary: "Fitness coaching conversation via Telegram",
        });
        console.log(`Created new thread: ${threadId}`);
      }

      // Check user's onboarding status to determine which agent to use
      const userProfile = await ctx.runQuery(api.users.getUserOnboardingInfo, {
        userId,
      });

      // Create appropriate agent based on onboarding status
      const agent = userProfile?.onboardingComplete
        ? createJymAgent(ctx)
        : createOnboardingAgent(ctx);
      const agentName = userProfile?.onboardingComplete
        ? "Jym"
        : "Onboarding Jym";

      console.log(
        `Using ${agentName} for user ${userId} (onboarding complete: ${userProfile?.onboardingComplete})`
      );

      // Generate response using the appropriate agent with userId context
      const result = await agent.generateText(
        ctx,
        { threadId, userId },
        {
          prompt: messageText,
        }
      );

      if (!result.text) {
        console.error("No response text generated");
        return {
          success: false,
          messages: ["hmm, didn't get a response. try again?"],
          error: "No response text generated",
        };
      }

      console.log(
        `Generated response for telegram ${telegramId}: ${result.text}`
      );

      return {
        success: true,
        messages: [result.text],
      };
    } catch (error) {
      console.error("Error generating response:", error);

      return {
        success: false,
        messages: ["sorry, something went wrong. can you try that again?"],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Check if user needs to authenticate (internal helper)
 */
export const checkUserAuthInternal = internalMutation({
  args: {
    telegramId: v.number(),
  },
  returns: v.object({
    authenticated: v.boolean(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { telegramId } = args;

    // Check if user exists by telegram ID in userProfiles
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_telegram_id")
      .filter((q) => q.eq(q.field("telegramId"), telegramId))
      .first();

    if (!userProfile) {
      return { authenticated: false };
    }

    // Verify the betterAuth user still exists
    const user = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "id", value: userProfile.userId }],
    });

    if (!user?._id) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      userId: user._id,
    };
  },
});

/**
 * Handle incoming telegram message (public action for bot to call)
 * This combines auth check and response generation in one call
 */
export const handleMessage = action({
  args: {
    telegramId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    messageText: v.string(),
    messageId: v.number(),
  },
  returns: v.object({
    authenticated: v.boolean(),
    success: v.boolean(),
    messages: v.array(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const {
      telegramId,
      username,
      firstName,
      lastName,
      messageText,
      messageId,
    } = args;

    // Check authentication
    const authCheck = await ctx.runMutation(
      internal.telegram.checkUserAuthInternal,
      {
        telegramId,
      }
    );

    if (!authCheck.authenticated) {
      return {
        authenticated: false,
        success: false,
        messages: [],
      };
    }

    // Generate response using the internal action
    const response = await ctx.runAction(internal.telegram.generateResponse, {
      userId: authCheck.userId ?? "",
      telegramId,
      username,
      firstName,
      lastName,
      messageText,
      messageId,
    });

    return {
      authenticated: true,
      ...response,
    };
  },
});

/**
 * Link telegram account to existing betterAuth user
 */
export const linkTelegramAccount = internalMutation({
  args: {
    userId: v.string(),
    telegramId: v.number(),
    username: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { userId, telegramId, username } = args;

    try {
      // Check if telegram ID is already linked to another user
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
        // Update existing profile with telegram ID
        await ctx.db.patch(userProfile._id, {
          telegramId,
          platform: "telegram",
        });
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
      }

      return {
        success: true,
        message: `Telegram account ${username || telegramId} linked successfully`,
      };
    } catch (error) {
      console.error("Error linking telegram account:", error);
      return {
        success: false,
        message: "Failed to link Telegram account",
      };
    }
  },
});
