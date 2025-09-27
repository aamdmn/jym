import { api } from "@jym/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { getToken } from "@/lib/auth-server";

/**
 * Example Server Component that fetches user data
 * This approach is non-reactive but perfect for static content
 */
export async function ServerUserProfile() {
  try {
    const token = await getToken();
    console.log("Server token:", token ? "Found" : "Not found");

    // Fetch user data on the server with authentication
    const user = await fetchQuery(api.auth.getCurrentUser, {}, { token });

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
      <div className="rounded-lg bg-blue-50 p-4">
        <h2 className="mb-2 font-semibold text-blue-900 text-lg">
          Server-Side User Profile
        </h2>
        <div className="text-blue-800">
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
          <p className="mt-2 text-blue-600 text-xs">
            ℹ️ This data was fetched on the server (non-reactive)
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Server-side auth error:", error);
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-red-600">
          ❌ Error loading user data:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }
}
