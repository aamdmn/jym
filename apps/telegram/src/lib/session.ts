import { api } from "@jym/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

if (!process.env.CONVEX_URL) {
  throw new Error("CONVEX_URL is not set");
}

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

export const getOrCreateUser = async ({
  telegramId,
  username,
  firstName,
  lastName,
}: {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}) => {
  try {
    // First, try to find existing user by telegramId
    const existingUser = await convex.query(api.users.getUserByTelegramId, {
      telegramId,
    });

    if (existingUser) {
      return existingUser;
    }

    // If user doesn't exist, create a new one
    await convex.mutation(api.users.createUser, {
      telegramId,
      username: username || "",
      firstName: firstName || "",
      lastName: lastName || "",
    });

    // Return the newly created user
    return await convex.query(api.users.getUserByTelegramId, {
      telegramId,
    });
  } catch (error) {
    // console.error("Error in getOrCreateUser:", error);
    throw error;
  }
};

export const clearSession = (userId: string) => {
  // Implementation for clearing session if needed
  // console.log(`Clearing session for user: ${userId}`);
};

export const updateSession = (
  userId: string,
  data: Record<string, unknown>
) => {
  // Implementation for updating session if needed
  // console.log(`Updating session for user: ${userId}`, data);
};
