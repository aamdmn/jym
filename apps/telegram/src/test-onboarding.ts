#!/usr/bin/env bun
import { OnboardingFlow } from "./lib/onboarding";

// Test the onboarding flow locally
async function testOnboardingFlow() {
  console.log("🧪 Testing onboarding flow...\n");

  const userId = 12_345; // Mock user ID
  const onboarding = new OnboardingFlow(userId);

  console.log("Starting onboarding flow:");
  console.log("=".repeat(50));

  // Simulate the onboarding questions and responses
  const mockResponses = [
    "I'm pretty much a beginner, just started working out recently",
    "I want to lose weight and get stronger, feeling better overall",
    "I have a home gym setup with dumbbells and a pull-up bar",
    "No major injuries, but my left knee sometimes gets sore after running",
  ];

  for (let i = 0; i < mockResponses.length; i++) {
    try {
      // Get the next question
      const questionResult = await onboarding.getNextQuestion();
      console.log(`\n🤖 Bot: ${questionResult.text}`);
      if (questionResult.responseId) {
        console.log(`   [Response ID: ${questionResult.responseId}]`);
      }

      // Simulate user response
      const userResponse = mockResponses[i];
      if (userResponse) {
        console.log(`👤 User: ${userResponse}`);

        // Process the response
        const { acknowledgment, isComplete, responseId } =
          await onboarding.processResponse(userResponse);
        console.log(`🤖 Bot: ${acknowledgment}`);
        if (responseId) {
          console.log(`   [Response ID: ${responseId}]`);
        }

        if (isComplete) {
          console.log("\n🎉 Onboarding completed!");
          const completionResult = await onboarding.getNextQuestion();
          console.log(`🤖 Bot: ${completionResult.text}`);
          if (completionResult.responseId) {
            console.log(
              `   [Final Response ID: ${completionResult.responseId}]`
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error(`❌ Error at step ${i + 1}:`, error);
      break;
    }
  }

  console.log("\n✅ Onboarding test completed!");
}

// Run the test
testOnboardingFlow().catch(console.error);
