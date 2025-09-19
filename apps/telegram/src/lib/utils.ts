import type { Experimental_AgentGenerateResult as AgentResult } from "ai";

/**
 * Extract the final message from agent result
 * Combines tool results into a human-readable response
 */
export function extractAgentMessage(result: AgentResult): string {
  // If there's text, use it
  if (result.text) {
    return result.text;
  }

  // If there are tool results, format them
  if (result.toolResults && result.toolResults.length > 0) {
    const toolResult = result.toolResults[0];

    // Handle generateChallenge tool result
    if (toolResult?.toolName === "generateChallenge" && toolResult.result) {
      const challenge = toolResult.result as {
        message?: string;
        exercise?: string;
        amount?: number;
        unit?: string;
      };
      if (challenge.message) {
        return challenge.message;
      }
      if (challenge.exercise && challenge.amount) {
        const unit = challenge.unit || "reps";
        return `alright, let's do ${challenge.amount} ${challenge.exercise}${
          unit === "seconds" ? ` for ${challenge.amount} seconds` : ""
        }`;
      }
    }

    // Handle trackWorkout tool result
    if (toolResult?.toolName === "trackWorkout" && toolResult.result) {
      const workout = toolResult.result as {
        message?: string;
        nextStep?: string;
      };
      if (workout.message) {
        return `${workout.message}\n\n${workout.nextStep || ""}`.trim();
      }
    }
  }

  // Fallback message
  return "let's get moving!";
}
