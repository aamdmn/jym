import { Bot } from "grammy";
import type { User } from "grammy/types";
import { getOrCreateUser } from "./lib/session";

if (!process.env.TELEGRAM_BOT_API_KEY) {
  throw new Error("TELEGRAM_BOT_API_KEY is not set");
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const bot = new Bot(process.env.TELEGRAM_BOT_API_KEY);

// Start command - begin onboarding
bot.command("start", async (ctx) => {
  const { id, is_bot, username, first_name, last_name } = ctx.from as User;

  if (!id || is_bot) {
    return;
  }

  const user = await getOrCreateUser({
    telegramId: id,
    username,
    firstName: first_name,
    lastName: last_name,
  });

  if (user?.onboardingComplete) {
    await ctx.reply("yo you're already set up");
    await ctx.reply("type /workout when you're ready to train");
    await ctx.reply("or just tell me how you're feeling");
    return;
  }

  //   // Start emotional onboarding
  //   clearSession(userId);
  //   updateSession(userId, { step: "pushups" });

  //   // Use AI to generate the initial challenge
  //   const startPrompt = `new user just typed /start.
  // give them an immediate physical challenge - tell them to do 10 pushups right now before we even talk.
  // be direct, controversial, and create an emotional moment.
  // use multiple short messages to build tension.
  // end by asking them to come back and tell you how many they actually did.`;

  //   const responses = await generateResponse(startPrompt);

  //   for (const msg of responses) {
  //     await ctx.reply(msg);
  //     await new Promise((r) => setTimeout(r, 800));
  //   }
});

// Workout command
// bot.command("workout", async (ctx) => {
//   const userId = ctx.from?.id.toString();
//   if (!userId) {
//     return;
//   }

//   const user = await getOrCreateUser(userId, ctx.from?.username);

//   if (!user?.onboardingComplete) {
//     await ctx.reply("hold up");
//     await ctx.reply("we haven't even talked yet");
//     await ctx.reply("type /start first");
//     return;
//   }

//   // Generate dynamic check-in
//   const checkInPrompt = `user typed /workout and wants to train.
// check in with them - ask about their energy level and what kind of workout they want.
// be conversational and keep your edge.
// use multiple short messages.`;

//   const responses = await generateResponse(
//     checkInPrompt,
//     user?.conversationContext as Array<{ role: string; content: string }>
//   );

//   for (const msg of responses) {
//     await ctx.reply(msg);
//     await new Promise((r) => setTimeout(r, 800));
//   }

//   updateSession(userId, { step: "ready" });
// });

// // Handle messages during onboarding and workouts
// bot.on("message:text", async (ctx) => {
//   try {
//     const userId = ctx.from?.id.toString();
//     if (!userId) {
//       return;
//     }

//     const user = await getOrCreateUser(userId, ctx.from?.username);
//     const session = getSession(userId);
//     const text = ctx.message.text.toLowerCase();

//     console.log(`Message from ${userId}: ${text.substring(0, 50)}...`);

//     // Onboarding flow
//     if (!user?.onboardingComplete && session.step) {
//       const context = session.conversationContext || [];

//       // Add user message to context
//       context.push({ role: "user", content: text });

//       // Generate AI response for this step
//       const responses = await handleOnboardingStep(session.step, text, context);

//       // Send AI responses
//       for (const msg of responses) {
//         await ctx.reply(msg);
//         await new Promise((r) => setTimeout(r, 800));
//       }

//       // Add assistant responses to context
//       context.push({ role: "assistant", content: responses.join("\n") });

//       // Update session with new context
//       updateSession(userId, { conversationContext: context });

//       // Handle data storage and step progression
//       switch (session.step) {
//         case "pushups":
//           updateSession(userId, { step: "fitness_level" });
//           break;

//         case "fitness_level": {
//           const level = text.includes("begin")
//             ? "beginner"
//             : text.includes("intermediate")
//               ? "intermediate"
//               : text.includes("advanced")
//                 ? "advanced"
//                 : null;

//           if (!level) {
//             // AI will handle asking again, just don't progress
//             return;
//           }

//           if (!user?.id) return;

//           await db
//             .update(users)
//             .set({ fitnessLevel: level })
//             .where(eq(users.id, user.id));

//           updateSession(userId, { step: "goals" });
//           break;
//         }

//         case "goals": {
//           if (!user?.id) return;

//           await db
//             .update(users)
//             .set({ goals: text })
//             .where(eq(users.id, user.id));

//           updateSession(userId, { step: "equipment" });
//           break;
//         }

//         case "equipment": {
//           // Store the raw text - AI will understand it
//           if (!user?.id) return;

//           await db
//             .update(users)
//             .set({ equipment: [text] })
//             .where(eq(users.id, user.id));

//           updateSession(userId, { step: "injuries" });
//           break;
//         }

//         case "injuries": {
//           const injuries = text === "no" || text === "none" ? null : text;

//           if (!user?.id) return;

//           await db
//             .update(users)
//             .set({
//               injuries,
//               onboardingComplete: true,
//               conversationContext: context, // Save onboarding context
//             })
//             .where(eq(users.id, user.id));

//           clearSession(userId);
//           break;
//         }
//       }
//       return;
//     }

//     // Handle workout generation
//     if (session.step === "ready") {
//       updateSession(userId, { tempData: { mood: text } });

//       if (!user?.id) return;

//       await ctx.reply("generating your workout...");
//       const messages = await generateWorkout(user.id);

//       for (const msg of messages) {
//         await ctx.reply(msg);
//         await new Promise((r) => setTimeout(r, 800));
//       }

//       await new Promise((r) => setTimeout(r, 1500));
//       await ctx.reply("when you're done, tell me how it went");
//       await ctx.reply(
//         "be specific - what felt good, what sucked, your rpe out of 10"
//       );

//       clearSession(userId);
//       return;
//     }

//     // Handle general feedback or conversation
//     if (
//       text.includes("done") ||
//       text.includes("finished") ||
//       text.includes("complete")
//     ) {
//       if (!user?.id) return;

//       const responses = await processWorkoutFeedback(user.id, text);
//       for (const msg of responses) {
//         await ctx.reply(msg);
//         await new Promise((r) => setTimeout(r, 800));
//       }
//     } else {
//       // General conversation
//       const responses = await generateResponse(
//         text,
//         user?.conversationContext as Array<{ role: string; content: string }>
//       );
//       for (const msg of responses) {
//         await ctx.reply(msg);
//         await new Promise((r) => setTimeout(r, 800));
//       }
//     }
//   } catch (error) {
//     console.error("Error handling message:", error);
//     await ctx.reply("fuck, something broke");
//     await ctx.reply("try again or type /start to reset");
//   }
// });

// // Error handling
// bot.catch((err) => {
//   console.error("Bot error:", err);
// });

console.log("starting controversial fitness coach...");
bot.start();
