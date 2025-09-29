import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import type { ModelMessage } from "ai";
import { components } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { MAIN_COACH_PROMPT, ONBOARDING_PROMPT } from "./prompts";
import {
  checkOnboardingTool,
  completeOnboardingTool,
  createTriggerTool,
  getCurrentExerciseTool,
  startWorkoutTool,
  updateOnboardingTool,
  updateWorkoutTool,
  waitFunctionTool,
} from "./tools";

/**
 * Shared context handler that adds current date/time to all agent interactions
 */
function createTimeAwareContextHandler(args: {
  allMessages: ModelMessage[];
  search: ModelMessage[];
  recent: ModelMessage[];
  inputMessages: ModelMessage[];
  inputPrompt: ModelMessage[];
  existingResponses: ModelMessage[];
  userId: string | undefined;
  threadId: string | undefined;
}): ModelMessage[] {
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

  return [
    timeContext,
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
    },
    contextHandler: (_, args) => {
      const context = createTimeAwareContextHandler(args);

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
    contextHandler: (_, args) => {
      const context = createTimeAwareContextHandler(args);
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
    contextHandler: (_, args) => {
      const context = createTimeAwareContextHandler(args);
      return context;
    },
  });
}

// Legacy static agents for backward compatibility (if needed)
export const jymAgent = new Agent(components.agent, {
  name: "Jym",
  languageModel: openai.chat("gpt-4.1"),
  textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
  instructions: MAIN_COACH_PROMPT,
  maxSteps: 5, // Increased to allow for trigger creation
  tools: {
    createTrigger: createTriggerTool,
    wait: waitFunctionTool,
  },
  contextHandler: (_, args) => {
    const context = createTimeAwareContextHandler(args);
    return context;
  },
});

export const onboardingAgent = new Agent(components.agent, {
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
  contextHandler: (_, args) => {
    const context = createTimeAwareContextHandler(args);
    return context;
  },
});
