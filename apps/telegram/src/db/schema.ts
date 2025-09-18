import {
	integer,
	pgTable,
	varchar,
	text,
	timestamp,
	jsonb,
	boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	telegramId: varchar({ length: 255 }).notNull().unique(),
	username: varchar({ length: 255 }),
	createdAt: timestamp().defaultNow().notNull(),

	// onboarding data
	onboardingComplete: boolean().default(false),
	fitnessLevel: varchar({ length: 50 }), // beginner, intermediate, advanced
	goals: text(),
	equipment: jsonb().default([]),
	injuries: text(),

	// context for ai
	conversationContext: jsonb().default([]),
	lastWorkoutDate: timestamp(),
});

export const workouts = pgTable("workouts", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	userId: integer()
		.references(() => users.id)
		.notNull(),
	createdAt: timestamp().defaultNow().notNull(),

	workout: jsonb().notNull(), // full workout details
	feedback: text(), // user feedback after workout
	rpe: integer(), // rate of perceived exertion 1-10
	duration: integer(), // minutes
	completed: boolean().default(false),

	// ai memory
	preWorkoutMood: text(),
	postWorkoutNotes: text(),
});
