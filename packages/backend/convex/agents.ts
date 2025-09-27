import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { MAIN_COACH_PROMPT, ONBOARDING_PROMPT } from "./prompts";
import {
  checkOnboardingTool,
  completeOnboardingTool,
  updateOnboardingTool,
} from "./tools";

/**
 * Create a dynamic Jym agent with user-specific context
 */
export function createJymAgent(_ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "Jym",
    languageModel: openai.chat("gpt-4o"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions: MAIN_COACH_PROMPT.replace("{{userId}}", userId),
    maxSteps: 3,
  });
}

/**
 * Create a dynamic onboarding agent with user-specific context and tools
 */
export function createOnboardingAgent(_ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "Onboarding Jym",
    languageModel: openai.chat("gpt-4o"),
    textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
    instructions: ONBOARDING_PROMPT.replace("{{userId}}", userId),
    maxSteps: 3,
    tools: {
      checkOnboarding: checkOnboardingTool,
      updateOnboarding: updateOnboardingTool,
      completeOnboarding: completeOnboardingTool,
    },
  });
}

// Legacy static agents for backward compatibility (if needed)
export const jymAgent = new Agent(components.agent, {
  name: "Jym",
  languageModel: openai.chat("gpt-4o"),
  textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
  instructions: "You are a adaptive fitness coach named Jym",
  maxSteps: 3,
});

export const onboardingAgent = new Agent(components.agent, {
  name: "Onboarding Jym",
  languageModel: openai.chat("gpt-4o"),
  textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
  instructions: ONBOARDING_PROMPT.replace("{{userId}}", "+421950571586"), // Default fallback
  maxSteps: 3,
  tools: {
    checkOnboarding: checkOnboardingTool,
    updateOnboarding: updateOnboardingTool,
    completeOnboarding: completeOnboardingTool,
  },
});
