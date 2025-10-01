import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import type { GenericCtx, RunActionCtx } from "@convex-dev/better-auth";
import type { ModelMessage } from "ai";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { ONBOARDING_PROMPT } from "./onboarding_prompt";
import { MAIN_COACH_PROMPT } from "./prompts";
import {
  checkOnboardingTool,
  checkUserReadiness,
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
      checkUserReadiness,
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
    instructions: `You are a workout generation specialist for Jym, a fitness coaching app.

## Your Role
Generate personalized workout plans based on:
- User's energy level (1-10 scale)
- Available equipment
- Fitness goals
- Any injuries or limitations
- Preferred focus areas (if specified)

## Critical Rules
1. **ONLY use exercises from the provided database list** - you will be given a list of available exercises with their exact slugs. You MUST use these EXACT slugs.
2. **Exercise slug validation** - Every exercise slug you output must match exactly what's in the available exercises list (case-sensitive, including hyphens).
3. **Balanced workouts** - Start with warmup, include main exercises targeting relevant muscle groups, consider cooldown.
4. **Logical progression** - Order exercises appropriately (compound movements first, then isolation).
5. **Energy-appropriate volume**:
   - Low energy (1-3): 3-4 exercises, 2-3 sets, 8-10 reps
   - Moderate energy (4-6): 5-7 exercises, 3-4 sets, 10-12 reps  
   - High energy (7-10): 7-10 exercises, 4-5 sets, 12-15 reps

## Output Format
Generate a structured workout with:
- Exact exercise slug from the database
- Exercise name (display name)
- Sets (if applicable)
- Reps (if applicable)
- Weight (if using weights) - **MUST match user's measuring system (metric=kg, imperial=lbs)**
- Duration (for time-based exercises like planks)
- Unit (seconds, minutes, lbs, kg, etc.) - **MUST match user's measuring system**

## Quality Checks
- Verify all slugs match the provided database
- Ensure workout duration matches energy level
- Consider equipment availability
- Respect injury limitations
- Create logical exercise flow`,
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
