import { api } from "@jym/backend/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { getToken } from "@/lib/auth-server";
import { ReactiveUserProfile } from "./ReactiveUserProfile";

/**
 * Server Component that preloads user data for a Client Component
 * This provides server-side rendering with client-side reactivity
 */
export async function PreloadedUserWrapper() {
  try {
    const token = await getToken();
    console.log("Preload token:", token ? "Found" : "Not found");

    // Preload user data on the server
    const preloadedUser = await preloadQuery(
      api.auth.getCurrentUser,
      {},
      { token }
    );

    return <ReactiveUserProfile preloadedUser={preloadedUser} />;
  } catch (error) {
    console.error("Preload auth error:", error);
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-red-600">
          ❌ Error preloading user data:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }
}
