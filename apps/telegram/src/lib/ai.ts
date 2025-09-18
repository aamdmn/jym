import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { users, workouts } from "../db/schema";

const SYSTEM_PROMPT = `you are a controversial fitness coach on telegram. your personality:
- always use lowercase
- send short, punchy messages
- be blunt and direct
- call out bullshit
- push people but know when to back off
- use minimal emojis, only when it adds punch
- speak like a real person texting, not a bot
- sometimes swear (but not excessively)
- break up thoughts into multiple short messages

you're not here to be nice. you're here to get results. but you also give a shit about your clients.

when generating workouts:
- be specific with sets, reps, rest times
- adapt based on their equipment and level
- remember their feedback and adjust
- if they're tired or stressed, adapt but don't coddle
- call them out if they're making excuses`;

export async function generateResponse(
  prompt: string,
  context?: any[],
  system?: string
) {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: system || SYSTEM_PROMPT,
      messages: [...(context || []), { role: "user", content: prompt }],
      temperature: 0.9,
    });

    // Split into multiple messages for more natural conversation
    const messages = text.split("\n").filter((m) => m.trim());
    return messages.length > 1 ? messages : [text];
  } catch (error) {
    console.error("AI generation error:", error);
    // Return fallback responses
    return ["shit, my brain just glitched", "try again in a sec"];
  }
}

export async function handleOnboardingStep(
  step: string,
  userMessage: string,
  context?: any[]
) {
  const onboardingPrompts: Record<string, string> = {
    pushups: `user just told you how many pushups they did: "${userMessage}". 
respond to this appropriately based on the number. be encouraging if low, impressed if high, but always keep your edge.
then transition to asking about their fitness level (beginner, intermediate, or advanced).
keep it conversational and short messages.`,

    fitness_level: `user said their fitness level is: "${userMessage}".
acknowledge it briefly and naturally.
if they didn't clearly say beginner, intermediate, or advanced, ask them to clarify.
otherwise, ask about their main goal - could be losing fat, building muscle, getting stronger, or just feeling better.
keep your personality but be helpful.`,

    goals: `user's goal is: "${userMessage}".
respond naturally to their specific goal.
then ask what equipment they have access to - dumbbells, pullup bar, gym access, or just bodyweight.
if they mention something emotional or vulnerable, acknowledge it briefly.`,

    equipment: `user described their equipment situation: "${userMessage}".
respond to what they said, especially if they mentioned fears or limitations.
be understanding if they mentioned gym anxiety or limitations.
then ask about any injuries or pain they should work around.`,

    injuries: `user said about injuries: "${userMessage}".
acknowledge their response appropriately.
then give them an encouraging wrap-up that we're ready to start training.
tell them to type /workout when ready.
end with energy and motivation.`,
  };

  const prompt = onboardingPrompts[step];
  if (!prompt) throw new Error(`Unknown onboarding step: ${step}`);

  return generateResponse(prompt, context);
}

export async function generateWorkout(userId: number) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user.length) throw new Error("User not found");

  const userData = user[0];
  if (!userData) throw new Error("User data not found");

  const recentWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.createdAt))
    .limit(5);

  const prompt = `generate a workout for this user:
fitness level: ${userData.fitnessLevel}
goals: ${userData.goals}
equipment description: ${Array.isArray(userData.equipment) ? userData.equipment.join(" ") : userData.equipment}
injuries: ${userData.injuries || "none"}

recent workouts and feedback:
${recentWorkouts
  .map(
    (w) => `
- ${new Date(w.createdAt).toLocaleDateString()}: completed: ${w.completed}, feedback: ${w.feedback}, rpe: ${w.rpe}/10
`
  )
  .join("\n")}

create a workout that:
- takes 15-45 minutes based on their recent performance
- includes warmup, main work, cooldown
- lists exact sets, reps, rest times
- adapts based on their recent feedback

format it clearly but keep your personality. send as multiple short messages.`;

  const messages = await generateResponse(
    prompt,
    userData.conversationContext as any[]
  );

  // Store the workout
  const workoutData = {
    exercises: messages.join("\n"),
    generatedAt: new Date(),
  };

  await db.insert(workouts).values({
    userId,
    workout: workoutData,
  });

  return messages;
}

export async function processWorkoutFeedback(userId: number, feedback: string) {
  const recentWorkout = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.createdAt))
    .limit(1);

  if (!recentWorkout.length) {
    return [
      "no workout to give feedback on",
      "start a new one when you're ready",
    ];
  }

  const workout = recentWorkout[0];
  if (!workout) throw new Error("Workout not found");

  await db
    .update(workouts)
    .set({
      feedback,
      completed: true,
    })
    .where(eq(workouts.id, workout.id));

  // Update user's conversation context
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (user.length) {
    const userData = user[0];
    if (!userData) return ["something went wrong updating context"];

    const context = (userData.conversationContext as any[]) || [];
    context.push({
      role: "user",
      content: `workout feedback: ${feedback}`,
    });

    // Keep last 10 context items
    if (context.length > 10) {
      context.splice(0, context.length - 10);
    }

    await db
      .update(users)
      .set({
        conversationContext: context,
        lastWorkoutDate: new Date(),
      })
      .where(eq(users.id, userId));
  }

  const response = await generateResponse(
    `user just finished workout and said: "${feedback}". respond appropriately. be real about it.`
  );

  return response;
}
