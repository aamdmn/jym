import { users } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export type UserSession = {
	step?:
		| "pushups"
		| "fitness_level"
		| "goals"
		| "equipment"
		| "injuries"
		| "ready";
	tempData?: Record<string, any>;
	conversationContext?: any[];
};

const sessions = new Map<string, UserSession>();

export const getSession = (userId: string): UserSession => {
	if (!sessions.has(userId)) {
		sessions.set(userId, {});
	}
	return sessions.get(userId)!;
};

export const updateSession = (userId: string, update: Partial<UserSession>) => {
	const current = getSession(userId);
	sessions.set(userId, { ...current, ...update });
};

export const clearSession = (userId: string) => {
	sessions.delete(userId);
};

export const getOrCreateUser = async (
	telegramId: string,
	username?: string,
) => {
	try {
		const existing = await db
			.select()
			.from(users)
			.where(eq(users.telegramId, telegramId))
			.limit(1);

		if (existing.length > 0) {
			return existing[0];
		}

		const newUser = await db
			.insert(users)
			.values({
				telegramId,
				username,
			})
			.returning();

		return newUser[0];
	} catch (error) {
		console.error("Error in getOrCreateUser:", error);
		throw error;
	}
};
