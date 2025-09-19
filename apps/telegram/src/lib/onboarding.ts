/** biome-ignore-all lint/suspicious/noConsole: we need to log */
import { api } from "@jym/backend/convex/_generated/api";
import { generateText, type ModelMessage } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { models } from "./models";

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set");
}

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

// Onboarding questions in order
export const ONBOARDING_QUESTIONS = [
  {
    key: "fitnessLevel" as const,
    question: "what's your fitness experience like?",
    context:
      "are you completely new to working out, been doing it for a while, or pretty experienced?",
    followUp:
      "just give me the real talk - beginner, intermediate, or advanced?",
  },
  {
    key: "goals" as const,
    question: "what do you want to get out of this?",
    context: "lose weight? get stronger? build muscle? just feel better?",
    followUp: "what's driving you to start working out?",
  },
  {
    key: "equipment" as const,
    question: "what equipment do you have access to?",
    context: "home gym, commercial gym, just bodyweight, or something else?",
    followUp: "where are you planning to work out most of the time?",
  },
  {
    key: "injuries" as const,
    question: "any injuries or things i should know about?",
    context:
      "bad knee, back issues, shoulder problems - anything that might affect workouts?",
    followUp: "or are you good to go with everything?",
  },
] as const;

export type OnboardingKey = (typeof ONBOARDING_QUESTIONS)[number]["key"];
export type OnboardingData = Record<OnboardingKey, string>;

// Onboarding questions and flow management

// Generate a conversational response for asking the next question
async function generateOnboardingQuestion(
  questionIndex: number,
  conversationHistory: ModelMessage[] = [],
  isFirstQuestion = false,
  previousResponseId?: string
): Promise<{ text: string; responseId?: string }> {
  const question = ONBOARDING_QUESTIONS[questionIndex];
  if (!question) {
    return { text: "" };
  }

  const messages: ModelMessage[] = [
    {
      role: "system",
      content: `You are a casual fitness coach having a natural conversation. Use lowercase, be friendly and conversational. ${
        isFirstQuestion
          ? "The user just completed an initial challenge. Acknowledge their effort and smoothly transition to getting to know them better."
          : "Continue the natural flow of getting to know this person. Reference their previous answers naturally."
      }`,
    },
    ...conversationHistory,
    {
      role: "user",
      content: `${isFirstQuestion ? "User just completed initial challenge. " : ""}Ask about: ${question.question}. Context: ${question.context}. Make it feel natural and conversational.`,
    },
  ];

  const result = await generateText({
    model: models.gpt5mini,
    messages,
    temperature: 0.7,
    providerOptions: {
      openai: {
        ...(previousResponseId && { previousResponseId }),
      },
    },
  });

  return {
    text: result.text,
    responseId: result.providerMetadata?.openai?.responseId as
      | string
      | undefined,
  };
}

// Process user's response and save to database
// biome-ignore lint/nursery/useMaxParams:  we need to pass all the parameters
async function processOnboardingResponse(
  telegramId: number,
  questionIndex: number,
  userResponse: string,
  conversationHistory: ModelMessage[] = [],
  previousResponseId?: string
): Promise<{ acknowledgment: string; responseId?: string }> {
  const question = ONBOARDING_QUESTIONS[questionIndex];
  if (!question) {
    return { acknowledgment: "" };
  }

  try {
    // we need to rewrite the user response with an AI so it's more comprehensive and natural
    const rewrittenResponse = await generateText({
      model: models.gpt4omini,
      system:
        "You are a fitness coach. You are rewriting the user's response to make it more comprehensive and natural. Do not change the user's original meaning, just make it more natural and comprehensive. Like filling in the gaps and making it more natural.",
      prompt: `
      Question: ${question.question}.
      \n\n
      User response: ${userResponse}.`,
    });

    console.log("Rewritten response:", rewrittenResponse.text);

    // Save the response to Convex (with error handling)
    try {
      if (question.key === "fitnessLevel") {
        await convex.mutation(api.users.updateFitnessLevel, {
          telegramId,
          fitnessLevel: rewrittenResponse.text,
        });
      } else if (question.key === "goals") {
        await convex.mutation(api.users.updateGoals, {
          telegramId,
          goals: rewrittenResponse.text,
        });
      } else if (question.key === "equipment") {
        await convex.mutation(api.users.updateEquipment, {
          telegramId,
          equipment: rewrittenResponse.text,
        });
      } else if (question.key === "injuries") {
        await convex.mutation(api.users.updateInjuries, {
          telegramId,
          injuries: rewrittenResponse.text,
        });
      }
      console.log(
        `✅ Saved ${question.key}: "${rewrittenResponse.text}" for user ${telegramId}`
      );
    } catch (dbError) {
      // Continue with conversation even if DB save fails
      console.log(
        `⚠️ DB save failed for ${question.key}, continuing conversation:`,
        dbError
      );
    }

    // Check if there's a next question
    const nextQuestionIndex = questionIndex + 1;
    const nextQuestion = ONBOARDING_QUESTIONS[nextQuestionIndex];

    if (nextQuestion) {
      // Generate combined acknowledgment + next question
      const messages: ModelMessage[] = [
        {
          role: "system",
          content:
            "You are a casual fitness coach in a natural conversation. Briefly and naturally acknowledge what they just shared, then smoothly ask the next question. Use lowercase, be conversational and natural. Don't make it feel like separate messages.",
        },
        ...conversationHistory,
        {
          role: "user",
          content: userResponse,
        },
        {
          role: "user",
          content: `Now smoothly transition to asking about: ${nextQuestion.question}. Context: ${nextQuestion.context}. Make it feel like one natural response.`,
        },
      ];

      const result = await generateText({
        model: models.gpt5mini,
        messages,
        temperature: 0.7,
        providerOptions: {
          openai: {
            ...(previousResponseId && { previousResponseId }),
          },
        },
      });

      return {
        acknowledgment: result.text,
        responseId: result.providerMetadata?.openai?.responseId as
          | string
          | undefined,
      };
    }

    // Last question - just acknowledgment
    const messages: ModelMessage[] = [
      {
        role: "system",
        content:
          "You are a casual fitness coach. Give a brief, encouraging acknowledgment. Use lowercase and keep it short.",
      },
      {
        role: "user",
        content: `User just told me about their ${question.key}: "${userResponse}". Give a brief encouraging response.`,
      },
    ];

    const result = await generateText({
      model: models.gpt5mini,
      messages,
      temperature: 0.7,
      providerOptions: {
        openai: {
          ...(previousResponseId && { previousResponseId }),
        },
      },
    });

    return {
      acknowledgment: result.text,
      responseId: result.providerMetadata?.openai?.responseId as
        | string
        | undefined,
    };
  } catch (error) {
    console.error("❌ Error in processOnboardingResponse:", error);
    return { acknowledgment: "got it, thanks" };
  }
}

// Complete onboarding process
async function completeOnboarding(
  telegramId: number,
  previousResponseId?: string
): Promise<{ text: string; responseId?: string }> {
  try {
    // Try to complete onboarding in database
    try {
      await convex.mutation(api.users.completeOnboarding, {
        telegramId,
      });
      console.log(`✅ Completed onboarding for user ${telegramId}`);
    } catch (dbError) {
      console.log("⚠️ DB onboarding completion failed, continuing:", dbError);
    }

    // Generate completion message
    const messages: ModelMessage[] = [
      {
        role: "system",
        content:
          "You are a fitness coach. The user just completed onboarding. Welcome them and get them excited about their fitness journey. Be encouraging, casual, and use lowercase. Mention you're ready to create personalized workouts for them.",
      },
      {
        role: "user",
        content:
          "User just finished onboarding. Welcome them to the program and get them excited about their fitness journey.",
      },
    ];

    const result = await generateText({
      model: models.gpt5mini,
      messages,
      temperature: 0.7,
      providerOptions: {
        openai: {
          ...(previousResponseId && { previousResponseId }),
        },
      },
    });

    return {
      text: result.text,
      responseId: result.providerMetadata?.openai?.responseId as
        | string
        | undefined,
    };
  } catch (error) {
    console.error("❌ Error in completeOnboarding:", error);
    return {
      text: "awesome! we're all set up. ready to get you moving with some personalized workouts!",
    };
  }
}

// Main onboarding flow manager
export class OnboardingFlow {
  private telegramId: number;
  private currentQuestionIndex: number;
  private conversationHistory: ModelMessage[];
  private lastResponseId?: string;

  constructor(telegramId: number) {
    this.telegramId = telegramId;
    this.currentQuestionIndex = 0;
    this.conversationHistory = [];
  }

  async getNextQuestion(): Promise<{ text: string; responseId?: string }> {
    if (this.currentQuestionIndex >= ONBOARDING_QUESTIONS.length) {
      return await completeOnboarding(this.telegramId, this.lastResponseId);
    }

    const isFirstQuestion = this.currentQuestionIndex === 0;
    const result = await generateOnboardingQuestion(
      this.currentQuestionIndex,
      this.conversationHistory,
      isFirstQuestion,
      this.lastResponseId
    );

    // Store the response ID for persistence
    if (result.responseId) {
      this.lastResponseId = result.responseId;
    }

    return result;
  }

  async processResponse(userResponse: string): Promise<{
    acknowledgment: string;
    isComplete: boolean;
    responseId?: string;
  }> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userResponse,
    });

    // Process the response and get combined acknowledgment + next question
    const result = await processOnboardingResponse(
      this.telegramId,
      this.currentQuestionIndex,
      userResponse,
      this.conversationHistory,
      this.lastResponseId
    );

    // Store the response ID for persistence
    if (result.responseId) {
      this.lastResponseId = result.responseId;
    }

    // Add assistant response to history
    this.conversationHistory.push({
      role: "assistant",
      content: result.acknowledgment,
    });

    // Move to next question
    this.currentQuestionIndex++;

    const isComplete = this.currentQuestionIndex >= ONBOARDING_QUESTIONS.length;

    return {
      acknowledgment: result.acknowledgment,
      isComplete,
      responseId: result.responseId,
    };
  }

  isComplete(): boolean {
    return this.currentQuestionIndex >= ONBOARDING_QUESTIONS.length;
  }

  getCurrentQuestionIndex(): number {
    return this.currentQuestionIndex;
  }

  getConversationHistory(): ModelMessage[] {
    return [...this.conversationHistory];
  }

  getLastResponseId(): string | undefined {
    return this.lastResponseId;
  }
}
