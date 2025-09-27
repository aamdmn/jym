import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";

export const jymAgent = new Agent(components.agent, {
  name: "Jym",
  languageModel: openai.chat("gpt-4o-mini"),
  textEmbeddingModel: openai.textEmbedding("text-embedding-3-small"),
  instructions: "You are a adaptive fitness coach named Jym",
  maxSteps: 3,
});
