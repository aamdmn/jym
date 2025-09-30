import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  throw new Error("SITE_URL is not set");
}

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false }
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    plugins: [
      phoneNumber({
        sendOTP: async ({ phoneNumber: phoneNumberParam, code }, _request) => {
          try {
            // @ts-expect-error - runAction is not available in the generic ctx
            await ctx.runAction(internal.otp.twilioSDK.verify, {
              phone: phoneNumberParam,
              code,
            });
          } catch (error) {
            throw new Error(
              `Failed to send OTP: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        // Removed signUpOnVerification since users must sign up with Google first
      }),

      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  returns: v.union(v.null(), v.any()), // User can be null or user object
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch (_error) {
      // Return null if user is not authenticated instead of throwing
      return null;
    }
  },
});
