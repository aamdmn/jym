import { openai } from "@ai-sdk/openai";

export const models = {
  gpt5mini: openai.responses("gpt-5-mini"),
  gpt5: openai.responses("gpt-5"),
  gpt4omini: openai.responses("gpt-4o-mini"),
};
