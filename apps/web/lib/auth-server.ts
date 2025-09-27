import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@jym/backend/convex/auth";

export const getToken = async () => {
  try {
    return await getTokenNextjs(createAuth);
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return;
  }
};
