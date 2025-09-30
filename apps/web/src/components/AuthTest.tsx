"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthTest() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = useQuery(api.auth.getCurrentUser);

  const handleSignUp = async () => {
    if (!(email && password)) {
      return;
    }
    setIsLoading(true);
    try {
      await authClient.signUp.email({
        email,
        password,
        name: "Test User",
      });
    } catch (error) {
      console.error("Sign up failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!(email && password)) {
      return;
    }
    setIsLoading(true);
    try {
      await authClient.signIn.email({
        email,
        password,
      });
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg bg-gray-50 p-6">
      <h3 className="font-semibold text-lg">Authentication Test</h3>

      {user ? (
        <div className="space-y-2">
          <p className="text-green-600">✅ Signed in as: {user.email}</p>
          <button
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
            disabled={isLoading}
            onClick={handleSignOut}
          >
            {isLoading ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">Not signed in</p>
          <div className="space-y-2">
            <input
              className="w-full rounded border border-gray-300 px-3 py-2"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              value={email}
            />
            <input
              className="w-full rounded border border-gray-300 px-3 py-2"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
            <div className="space-x-2">
              <button
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                disabled={isLoading}
                onClick={handleSignIn}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
              <button
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
                disabled={isLoading}
                onClick={handleSignUp}
              >
                {isLoading ? "Signing up..." : "Sign Up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
