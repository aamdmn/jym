import { Experimental_Agent as Agent, tool } from "ai";
import { z } from "zod";
import { models } from "./models";

// Simple challenge generation tool
const generateChallengeTool = tool({
  description: "Generate a quick fitness challenge for the user",
  inputSchema: z.object({
    difficulty: z
      .enum(["easy", "medium", "hard"])
      .describe("Difficulty level of the challenge"),
    context: z.string().describe("User's current state or mood"),
  }),
  // biome-ignore lint/suspicious/useAwait: required
  execute: async ({ difficulty = "easy" }) => {
    // Define simple exercises with variations
    const exercises = {
      easy: [
        { name: "pushups", count: 10, unit: "reps" },
        { name: "squats", count: 15, unit: "reps" },
        { name: "jumping jacks", count: 20, unit: "reps" },
        { name: "high knees", count: 20, unit: "reps" },
      ],
      medium: [
        { name: "pushups", count: 15, unit: "reps" },
        { name: "squats", count: 25, unit: "reps" },
        { name: "burpees", count: 10, unit: "reps" },
        { name: "plank", count: 45, unit: "seconds" },
        { name: "lunges", count: 20, unit: "reps" },
      ],
      hard: [
        { name: "pushups", count: 25, unit: "reps" },
        { name: "burpees", count: 15, unit: "reps" },
        { name: "jump squats", count: 20, unit: "reps" },
        { name: "plank", count: 60, unit: "seconds" },
        { name: "mountain climbers", count: 30, unit: "reps" },
      ],
    };

    const exerciseList = exercises[difficulty];
    const selected =
      exerciseList[Math.floor(Math.random() * exerciseList.length)];

    return {
      exercise: selected?.name,
      amount: selected?.count,
      unit: selected?.unit,
      difficulty,
      message: `alright, let's do ${selected?.count} ${selected?.name}${selected?.unit === "seconds" ? ` for ${selected?.count} seconds` : ""}. ${
        difficulty === "easy"
          ? "nice and easy to get started"
          : difficulty === "medium"
            ? "let's get that heart rate up"
            : "time to push yourself"
      }`,
    };
  },
});

// Track workout completion
const trackWorkoutTool = tool({
  description: "Track that user completed a workout or challenge",
  inputSchema: z.object({
    completed: z.boolean(),
    exercise: z.string(),
    feedback: z.string().optional(),
  }),
  // biome-ignore lint/suspicious/useAwait: required
  execute: async ({ completed }) => {
    if (completed) {
      const encouragements = [
        "hell yeah! that's what i'm talking about",
        "boom! you crushed it",
        "nice work! feeling good?",
        "that's it! you're getting stronger",
        "awesome job! keep that energy going",
      ];
      return {
        message:
          encouragements[Math.floor(Math.random() * encouragements.length)],
        nextStep: "want another challenge or need a breather?",
      };
    }
    return {
      message: "no worries, any movement counts",
      nextStep: "want to try something easier?",
    };
  },
});

// Create the fitness coach agent
export const fitnessCoach = new Agent({
  model: models.gpt5mini,
  system: `you are a no-bullshit fitness coach on telegram. your personality:

- always write in lowercase, no caps ever
- keep messages short and punchy
- use minimal punctuation
- break thoughts into multiple messages
- be encouraging but real
- occasionally use mild swearing for emphasis
- never use emojis in your actual text, only sometimes at the end
- sound like a friend texting, not a bot

conversation style:
- when someone new joins, give them a quick challenge right away
- don't over-explain, just get them moving
- adapt to their energy - if they're tired, go easier
- celebrate wins but keep it casual
- never lecture or give long explanations
- IMPORTANT: only give ONE exercise per request

tool usage - keep it simple:
- use generateChallenge when user wants a workout or when they're new
- use trackWorkout when user says they completed something
- after using a tool, respond in your casual style
- don't overthink it - just be helpful and encouraging

examples of your style:
"yo let's go"
"10 pushups right now"
"come on, you got this"
"nice work"
"feeling tired? no problem"
"let's do something easier"
"that was sick 💪"

remember: short messages, lowercase only, ONE challenge at a time`,

  tools: {
    generateChallenge: generateChallengeTool,
    trackWorkout: trackWorkoutTool,
  },
});
