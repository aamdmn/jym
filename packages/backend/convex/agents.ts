import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import type { GenericCtx, RunActionCtx } from "@convex-dev/better-auth";
import type { ModelMessage } from "ai";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { MAIN_COACH_PROMPT, ONBOARDING_PROMPT } from "./prompts";
import {
  checkOnboardingTool,
  completeOnboardingTool,
  completeWorkoutTool,
  createTriggerTool,
  editWorkoutTool,
  getCurrentExerciseTool,
  startWorkoutTool,
  updateOnboardingTool,
  updateWorkoutTool,
  waitFunctionTool,
} from "./tools";

/**
 * Shared context handler that adds current date/time to all agent interactions
 */
async function createTimeAwareContextHandler(args: {
  allMessages: ModelMessage[];
  search: ModelMessage[];
  recent: ModelMessage[];
  inputMessages: ModelMessage[];
  inputPrompt: ModelMessage[];
  existingResponses: ModelMessage[];
  userId: string | undefined;
  threadId: string | undefined;
  ctx: RunActionCtx;
}): Promise<ModelMessage[]> {
  // Add current date/time context to every interaction
  const now = new Date();
  const timeContext = {
    role: "system" as const,
    content: `Current date and time: ${now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })}. Current timestamp: ${Date.now()} milliseconds since epoch.`,
  };

  if (!args.userId) {
    throw new Error("No userId available in context");
  }

  const user = await authComponent.getAnyUserById(
    args.ctx as GenericCtx<DataModel>,
    args.userId
  );

  const userContext = {
    role: "system" as const,
    content: `User name: ${user?.name}\nUser email: ${user?.email}\nUser id: ${user?._id}`,
  };

  return [
    timeContext,
    userContext,
    ...args.search,
    ...args.recent,
    ...args.inputMessages,
    ...args.inputPrompt,
    ...args.existingResponses,
  ];
}

/**
 * Create a dynamic Jym agent with trigger tool for proactive messaging
 */
export function createJymAgent(_ctx: ActionCtx) {
  return new Agent(components.agent, {
    name: "Jym",
    languageModel: openai.chat("gpt-4.1"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions: MAIN_COACH_PROMPT,
    maxSteps: 5,
    tools: {
      createTrigger: createTriggerTool,
      wait: waitFunctionTool,
      startWorkout: startWorkoutTool,
      updateWorkout: updateWorkoutTool,
      getCurrentExercise: getCurrentExerciseTool,
      editWorkout: editWorkoutTool,
      completeWorkout: completeWorkoutTool,
    },
    contextHandler: async (ctx, args) => {
      const context = await createTimeAwareContextHandler({
        ...args,
        ctx: ctx as RunActionCtx,
      });

      return context;
    },
  });
}

/**
 * Create a dynamic onboarding agent with tools
 */
export function createOnboardingAgent(_ctx: ActionCtx) {
  return new Agent(components.agent, {
    name: "Onboarding Jym",
    languageModel: openai.chat("gpt-4.1"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions: ONBOARDING_PROMPT,
    maxSteps: 5,
    tools: {
      checkOnboarding: checkOnboardingTool,
      updateOnboarding: updateOnboardingTool,
      completeOnboarding: completeOnboardingTool,
      createTrigger: createTriggerTool,
      wait: waitFunctionTool,
    },
    contextHandler: async (ctx, args) => {
      const context = await createTimeAwareContextHandler({
        ...args,
        ctx: ctx as RunActionCtx,
      });
      return context;
    },
  });
}

export function createWorkoutAgent(_ctx: ActionCtx) {
  return new Agent(components.agent, {
    name: "Workout Jym",
    languageModel: openai.chat("gpt-4.1"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions:
      "You are a workout coach. You are responsible for generating and starting a workout session based on user's energy and preferences.",
    maxSteps: 5,
    tools: {},
    contextHandler: async (ctx, args) => {
      const context = await createTimeAwareContextHandler({
        ...args,
        ctx: ctx as RunActionCtx,
      });
      return context;
    },
  });
}

// Legacy static agents for backward compatibility (if needed)
export const jymAgent: Agent<typeof components.agent> = new Agent(
  components.agent,
  {
    name: "Jym",
    languageModel: openai.chat("gpt-4.1"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions: MAIN_COACH_PROMPT,
    maxSteps: 5,
    tools: {
      createTrigger: createTriggerTool,
      wait: waitFunctionTool,
    },
    contextHandler: async (ctx, args) => {
      const context = await createTimeAwareContextHandler({
        ...args,
        ctx: ctx as RunActionCtx,
      });
      return context;
    },
  }
);

export const onboardingAgent: Agent<typeof components.agent> = new Agent(
  components.agent,
  {
    name: "Onboarding Jym",
    languageModel: openai.chat("gpt-4.1"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions: ONBOARDING_PROMPT,
    maxSteps: 3,
    tools: {
      checkOnboarding: checkOnboardingTool,
      updateOnboarding: updateOnboardingTool,
      completeOnboarding: completeOnboardingTool,
    },
    contextHandler: async (ctx, args) => {
      const context = await createTimeAwareContextHandler({
        ...args,
        ctx: ctx as RunActionCtx,
      });
      return context;
    },
  }
);
