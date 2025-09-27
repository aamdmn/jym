import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { getToken } from "@/lib/auth-server";

async function getUser() {
  try {
    const token = await getToken();
    return await fetchQuery(api.auth.getCurrentUser, {}, { token });
  } catch (error) {
    console.error("Failed to get user:", error);
    return;
  }
}

/**
 * Simple Server Component that fetches user data without authentication
 * This tests if the basic server-side fetching works in our monorepo setup
 */
export async function SimpleServerProfile() {
  const user = await getUser();

  console.log("User:", user);

  return (
    <div className="rounded-lg bg-purple-50 p-4">
      <h2 className="mb-2 font-semibold text-lg text-purple-900">
        Simple Server Profile (No Auth)
      </h2>
      <div className="text-purple-800">
        {user ? (
          <>
            <p>
              <strong>User ID:</strong> {user._id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Name:</strong> {user.name || "Not set"}
            </p>
            <p className="mt-2 text-purple-600 text-xs">
              ✅ Server-side fetching works! (without auth token)
            </p>
          </>
        ) : (
          <p className="text-purple-600">
            No user found (expected when not authenticated)
          </p>
        )}
      </div>
    </div>
  );
}
