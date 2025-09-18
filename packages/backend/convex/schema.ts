import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    telegramId: v.number(),
    onboardingComplete: v.boolean(),
    fitnessLevel: v.string(),
    goals: v.string(),
    equipment: v.string(),
    injuries: v.string(),
    lastWorkoutDate: v.optional(v.string()),
  }),
});
