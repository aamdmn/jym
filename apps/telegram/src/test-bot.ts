#!/usr/bin/env bun
import { stepCountIs } from "ai";
import { fitnessCoach } from "./lib/agent";

// Test the agent locally without Telegram
async function testAgent() {
  console.log("🧪 Testing fitness coach agent...\n");

  // Test 1: Initial challenge
  console.log("Test 1: Generating initial challenge");
  console.log("-".repeat(40));

  const initialChallenge = await fitnessCoach.generate({
    messages: [
      {
        role: "user",
        content:
          "new user Alex just started. give them an easy quick challenge to get them moving",
      },
    ],
    toolChoice: "auto",
    stopWhen: stepCountIs(3),
  });

  console.log("Response:", initialChallenge.text);
  console.log(
    "\nTool calls:",
    initialChallenge.toolCalls.map((tc) => tc.toolName)
  );
  console.log("-".repeat(40));

  // Test 2: User completed challenge
  console.log("\nTest 2: User completed challenge");
  console.log("-".repeat(40));

  const completedResponse = await fitnessCoach.generate({
    messages: [
      {
        role: "assistant",
        content: initialChallenge.text || "do 10 pushups",
      },
      {
        role: "user",
        content: "done! that was actually pretty good",
      },
    ],
    toolChoice: "auto",
    stopWhen: stepCountIs(3),
  });

  console.log("Response:", completedResponse.text);
  console.log("-".repeat(40));

  // Test 3: User wants harder challenge
  console.log("\nTest 3: User wants harder challenge");
  console.log("-".repeat(40));

  const harderChallenge = await fitnessCoach.generate({
    messages: [
      {
        role: "user",
        content: "give me something harder, i'm feeling pumped",
      },
    ],
    stopWhen: stepCountIs(3),
  });

  console.log("Response:", harderChallenge.text);
  console.log("-".repeat(40));

  // Test 4: User is tired
  console.log("\nTest 4: User is tired");
  console.log("-".repeat(40));

  const tiredResponse = await fitnessCoach.generate({
    messages: [
      {
        role: "user",
        content: "i'm really tired today, not feeling it",
      },
    ],
    stopWhen: stepCountIs(5),
  });

  console.log("Response:", tiredResponse.text);
  console.log("-".repeat(40));

  console.log("\n✅ All tests completed!");
}

// Run tests
testAgent().catch(console.error);
