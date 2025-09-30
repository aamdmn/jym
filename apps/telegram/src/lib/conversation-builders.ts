import type { Context } from "grammy";
import { fitnessCoach } from "./agent";
import {
  ConversationContextManager,
  createContextManager,
} from "./context-manager";
import type { MyConversation, OnboardingData } from "./types";
import { extractAgentMessage } from "./utils";

// Helper to send messages naturally with typing
async function sendNaturalMessage(ctx: Context, text: string) {
  const messages = text.split("\n\n").filter((msg) => msg.trim());

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]?.trim();
    if (!message) continue;

    await ctx.replyWithChatAction("typing");
    const typingDelay = Math.min(Math.max(message.length * 40, 500), 2000);
    await new Promise((resolve) => setTimeout(resolve, typingDelay));
    await ctx.reply(message);

    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

// Onboarding conversation flow
export async function onboardingConversation(
  conversation: MyConversation,
  ctx: Context
) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const firstName = ctx.from?.first_name;

  if (!(userId && chatId)) {
    return;
  }

  // Initialize conversation context
  const contextManager = createContextManager(conversation, ctx);
  await contextManager.initialize(userId, chatId, "onboarding");

  const onboardingData: OnboardingData = {};

  // Welcome and acknowledge their initial response
  await sendNaturalMessage(
    ctx,
    `nice! i can see you're ready to get moving\n\nbefore we dive in, let me ask you a few quick questions so i can give you the best workouts`
  );

  // Step 1: Fitness level
  await contextManager.setWaiting("fitness_level");
  await sendNaturalMessage(
    ctx,
    "what's your current fitness level?\n\na) beginner (just starting out)\nb) intermediate (work out regularly)\nc) advanced (been training for years)"
  );

  const fitnessLevelCtx = await conversation.waitFor("message:text");
  const fitnessLevel = fitnessLevelCtx.message.text.toLowerCase();

  await contextManager.addMessage("user", fitnessLevel);

  if (fitnessLevel.includes("a") || fitnessLevel.includes("beginner")) {
    onboardingData.fitnessLevel = "beginner";
    await sendNaturalMessage(ctx, "perfect! everyone starts somewhere");
  } else if (
    fitnessLevel.includes("b") ||
    fitnessLevel.includes("intermediate")
  ) {
    onboardingData.fitnessLevel = "intermediate";
    await sendNaturalMessage(
      ctx,
      "solid! i like someone who knows their way around"
    );
  } else if (fitnessLevel.includes("c") || fitnessLevel.includes("advanced")) {
    onboardingData.fitnessLevel = "advanced";
    await sendNaturalMessage(ctx, "damn! respect. let's push those limits");
  } else {
    onboardingData.fitnessLevel = "beginner";
    await sendNaturalMessage(
      ctx,
      "no worries, we'll start where you're comfortable"
    );
  }

  // Step 2: Goals
  await contextManager.setWaiting("goals");
  await sendNaturalMessage(
    ctx,
    "what are you trying to achieve? (pick as many as you want)\n\na) lose weight\nb) build muscle\nc) get stronger\nd) improve cardio\ne) just stay active"
  );

  const goalsCtx = await conversation.waitFor("message:text");
  const goalsText = goalsCtx.message.text.toLowerCase();

  await contextManager.addMessage("user", goalsText);

  const goals: string[] = [];
  if (
    goalsText.includes("a") ||
    goalsText.includes("lose") ||
    goalsText.includes("weight")
  ) {
    goals.push("weight_loss");
  }
  if (
    goalsText.includes("b") ||
    goalsText.includes("muscle") ||
    goalsText.includes("build")
  ) {
    goals.push("muscle_building");
  }
  if (
    goalsText.includes("c") ||
    goalsText.includes("strong") ||
    goalsText.includes("strength")
  ) {
    goals.push("strength");
  }
  if (
    goalsText.includes("d") ||
    goalsText.includes("cardio") ||
    goalsText.includes("endurance")
  ) {
    goals.push("cardio");
  }
  if (
    goalsText.includes("e") ||
    goalsText.includes("active") ||
    goalsText.includes("stay")
  ) {
    goals.push("general_fitness");
  }

  onboardingData.goals = goals.length > 0 ? goals : ["general_fitness"];

  await sendNaturalMessage(ctx, "got it! those are solid goals");

  // Step 3: Equipment
  await contextManager.setWaiting("equipment");
  await sendNaturalMessage(
    ctx,
    "what equipment do you have access to?\n\na) just my body (no equipment)\nb) basic stuff (dumbbells, resistance bands)\nc) home gym setup\nd) full gym access"
  );

  const equipmentCtx = await conversation.waitFor("message:text");
  const equipmentText = equipmentCtx.message.text.toLowerCase();

  await contextManager.addMessage("user", equipmentText);

  if (
    equipmentText.includes("a") ||
    equipmentText.includes("body") ||
    equipmentText.includes("no")
  ) {
    onboardingData.equipment = ["bodyweight"];
    await sendNaturalMessage(
      ctx,
      "bodyweight only? perfect. some of the best workouts need nothing but you"
    );
  } else if (
    equipmentText.includes("b") ||
    equipmentText.includes("basic") ||
    equipmentText.includes("dumbbells")
  ) {
    onboardingData.equipment = ["dumbbells", "resistance_bands"];
    await sendNaturalMessage(ctx, "nice! basic equipment goes a long way");
  } else if (equipmentText.includes("c") || equipmentText.includes("home")) {
    onboardingData.equipment = ["home_gym"];
    await sendNaturalMessage(ctx, "home gym setup! love it");
  } else {
    onboardingData.equipment = ["full_gym"];
    await sendNaturalMessage(ctx, "full gym access? we're gonna have some fun");
  }

  // Step 4: Injuries/limitations
  await contextManager.setWaiting("injuries");
  await sendNaturalMessage(
    ctx,
    "any injuries or things i should know about?\n\njust type 'none' if you're all good, or tell me what to watch out for"
  );

  const injuriesCtx = await conversation.waitFor("message:text");
  const injuriesText = injuriesCtx.message.text;

  await contextManager.addMessage("user", injuriesText);

  if (injuriesText.toLowerCase().includes("none")) {
    onboardingData.injuries = [];
    await sendNaturalMessage(
      ctx,
      "awesome! no limitations means we can do anything"
    );
  } else {
    onboardingData.injuries = [injuriesText];
    await sendNaturalMessage(ctx, "noted! i'll make sure to work around that");
  }

  // Update user context with onboarding data
  await contextManager.updateUserContext({
    fitnessLevel: onboardingData.fitnessLevel,
    currentGoals: onboardingData.goals,
    preferences: {
      equipment: onboardingData.equipment,
      injuries: onboardingData.injuries,
    },
  });

  // Mark onboarding as complete
  await contextManager.updateContext({
    session: {
      ...contextManager.getContext()?.session!,
      currentPhase: "active_chat",
    },
  });

  // Final message and first workout challenge
  await sendNaturalMessage(
    ctx,
    `alright ${firstName?.toLowerCase()}, we're all set!\n\nlet's start with something quick to get you moving`
  );

  // Generate first workout using LLM with context
  try {
    const messages = contextManager.getLLMMessages();
    messages.push({
      role: "user",
      content: `give me a quick ${onboardingData.fitnessLevel} level challenge using ${onboardingData.equipment?.join(", ")} equipment. goals: ${onboardingData.goals?.join(", ")}`,
      timestamp: Date.now(),
    });

    const result = await fitnessCoach.generate({
      messages,
      toolChoice: "auto",
      ...(contextManager.getLastResponseId() && {
        providerOptions: {
          openai: {
            previousResponseId: contextManager.getLastResponseId(),
          },
        },
      }),
    });

    let message = result.text || "";
    if (!message && result.toolResults?.length) {
      message = extractAgentMessage(result);
    }
    if (!message) {
      message = "let's start with 10 pushups (modify on knees if needed)";
    }

    await sendNaturalMessage(ctx, message);

    // Update conversation with LLM response
    await contextManager.addMessage(
      "assistant",
      message,
      result.toolCalls,
      result.toolResults
    );
    if (result.providerMetadata?.openai?.responseId) {
      await contextManager.updateResponseId(
        result.providerMetadata.openai.responseId
      );
    }
  } catch (error) {
    console.error("Error generating first workout:", error);
    await sendNaturalMessage(ctx, "let's start simple - give me 10 squats");
  }

  await contextManager.complete();
}

// Main fitness chat conversation
export async function fitnessConversation(
  conversation: MyConversation,
  ctx: Context
) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const userMessage = ctx.message?.text;

  if (!(userId && chatId && userMessage)) {
    return;
  }

  // Initialize conversation context
  const contextManager = createContextManager(conversation, ctx);
  await contextManager.initialize(userId, chatId, "fitness_chat");

  // Add user message to context
  await contextManager.addMessage("user", userMessage);

  // Get conversation messages for LLM
  const messages = contextManager.getLLMMessages();

  try {
    // Generate response with full context
    const result = await fitnessCoach.generate({
      messages,
      toolChoice: "auto",
      ...(contextManager.getLastResponseId() && {
        providerOptions: {
          openai: {
            previousResponseId: contextManager.getLastResponseId(),
          },
        },
      }),
    });

    // Handle response
    let responseText = result.text || "";
    if (!responseText && result.toolResults?.length) {
      responseText = extractAgentMessage(result);
    }
    if (!responseText) {
      responseText = "how you feeling? ready to move?";
    }

    await sendNaturalMessage(ctx, responseText);

    // Update conversation with LLM response
    await contextManager.addMessage(
      "assistant",
      responseText,
      result.toolCalls,
      result.toolResults
    );

    // Update response ID for persistence
    if (result.providerMetadata?.openai?.responseId) {
      await contextManager.updateResponseId(
        result.providerMetadata.openai.responseId
      );
    }

    // Update conversation memory based on interaction
    const userMoodInference = userMessage.toLowerCase().includes("tired")
      ? "tired"
      : userMessage.toLowerCase().includes("excited")
        ? "excited"
        : userMessage.toLowerCase().includes("motivated")
          ? "motivated"
          : undefined;

    if (userMoodInference) {
      await contextManager.updateConversationMemory({
        userMood: userMoodInference,
      });
    }
  } catch (error) {
    console.error("Error in fitness conversation:", error);
    await sendNaturalMessage(
      ctx,
      "my bad, brain freeze\n\nhow you feeling though?"
    );
  }
}

// Quick workout session conversation
export async function quickWorkoutConversation(
  conversation: MyConversation,
  ctx: Context
) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!(userId && chatId)) {
    return;
  }

  // Initialize conversation context
  const contextManager = createContextManager(conversation, ctx);
  await contextManager.initialize(userId, chatId, "quick_challenge");

  try {
    // Generate quick workout challenge
    const result = await fitnessCoach.generate({
      messages: [
        {
          role: "user",
          content: "give me a quick workout challenge right now",
          timestamp: Date.now(),
        },
      ],
      toolChoice: "auto",
    });

    let message = result.text || "";
    if (!message && result.toolResults?.length) {
      message = extractAgentMessage(result);
    }
    if (!message) {
      message = "alright let's go\n\n20 squats right now";
    }

    await sendNaturalMessage(ctx, message);

    // Update context
    await contextManager.addMessage(
      "assistant",
      message,
      result.toolCalls,
      result.toolResults
    );
    if (result.providerMetadata?.openai?.responseId) {
      await contextManager.updateResponseId(
        result.providerMetadata.openai.responseId
      );
    }

    await contextManager.complete();
  } catch (error) {
    console.error("Error generating quick workout:", error);
    await sendNaturalMessage(ctx, "alright let's go\n\n20 squats right now");
  }
}
