"use client";

import type { api } from "@jym/backend/convex/_generated/api";
import { type Preloaded, usePreloadedQuery } from "convex/react";

type Props = {
  preloadedUser: Preloaded<typeof api.auth.getCurrentUser>;
};

/**
 * Client Component that uses preloaded user data
 * This approach provides both server-side rendering AND client-side reactivity
 */
export function ReactiveUserProfile({ preloadedUser }: Props) {
  // Use the preloaded data - this will be reactive to changes
  const user = usePreloadedQuery(preloadedUser);

  if (!user) {
    return (
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-gray-600">
          Not authenticated - Sign in to see your profile
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-green-50 p-4">
      <h2 className="mb-2 font-semibold text-green-900 text-lg">
        Preloaded + Reactive User Profile
      </h2>
      <div className="text-green-800">
        <p>
          <strong>User ID:</strong> {user._id}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Name:</strong> {user.name || "Not set"}
        </p>
        <p>
          <strong>Created:</strong>{" "}
          {new Date(user._creationTime).toLocaleDateString()}
        </p>
        <p className="mt-2 text-green-600 text-xs">
          ⚡ This data was preloaded on server but is reactive on client
        </p>
      </div>
    </div>
  );
}
