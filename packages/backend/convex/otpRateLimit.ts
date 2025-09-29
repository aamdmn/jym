import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

// Rate limiting constants
const SEND_OTP_LIMIT = 3; // Maximum OTP sends per time window
const SEND_OTP_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const VERIFY_OTP_LIMIT = 5; // Maximum verification attempts per OTP
const VERIFY_OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes window
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between resends
const CLEANUP_THRESHOLD_MS = 24 * 60 * 60 * 1000; // Clean up attempts older than 24 hours

// Helper function to check send OTP rate limit
async function checkCanSendOtp(
  ctx: QueryCtx,
  phoneNumber: string
): Promise<{
  allowed: boolean;
  reason?: string;
  remainingAttempts: number;
  nextAllowedTime?: number;
}> {
  const now = Date.now();
  const windowStart = now - SEND_OTP_WINDOW_MS;

  // Get all send attempts within the time window
  const attempts = await ctx.db
    .query("otpAttempts")
    .withIndex("by_phone_and_timestamp", (q) =>
      q.eq("phoneNumber", phoneNumber).gte("timestamp", windowStart)
    )
    .filter((q) => q.eq(q.field("attemptType"), "send"))
    .collect();

  // Check for recent send to enforce cooldown
  const recentAttempts = attempts.filter(
    (a) => now - a.timestamp < RESEND_COOLDOWN_MS
  );
  if (recentAttempts.length > 0) {
    const mostRecent = recentAttempts[0];
    const nextAllowed = mostRecent.timestamp + RESEND_COOLDOWN_MS;
    return {
      allowed: false,
      reason: "Please wait before requesting another code",
      remainingAttempts: Math.max(0, SEND_OTP_LIMIT - attempts.length),
      nextAllowedTime: nextAllowed,
    };
  }

  // Check if limit exceeded
  if (attempts.length >= SEND_OTP_LIMIT) {
    // Find the oldest attempt to determine when the window resets
    const oldestAttempt = attempts.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest
    );
    const nextAllowed = oldestAttempt.timestamp + SEND_OTP_WINDOW_MS;

    return {
      allowed: false,
      reason: "Too many OTP requests. Please try again later",
      remainingAttempts: 0,
      nextAllowedTime: nextAllowed,
    };
  }

  return {
    allowed: true,
    remainingAttempts: SEND_OTP_LIMIT - attempts.length,
  };
}

// Helper function to check verify OTP rate limit
async function checkCanVerifyOtp(
  ctx: QueryCtx,
  phoneNumber: string
): Promise<{
  allowed: boolean;
  reason?: string;
  remainingAttempts: number;
}> {
  const now = Date.now();
  const windowStart = now - VERIFY_OTP_WINDOW_MS;

  // Get all verification attempts within the time window
  const attempts = await ctx.db
    .query("otpAttempts")
    .withIndex("by_phone_and_timestamp", (q) =>
      q.eq("phoneNumber", phoneNumber).gte("timestamp", windowStart)
    )
    .filter((q) => q.eq(q.field("attemptType"), "verify"))
    .collect();

  // Count failed attempts
  const failedAttempts = attempts.filter((a) => !a.success);

  if (failedAttempts.length >= VERIFY_OTP_LIMIT) {
    return {
      allowed: false,
      reason:
        "Too many failed verification attempts. Please request a new code",
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    remainingAttempts: VERIFY_OTP_LIMIT - failedAttempts.length,
  };
}

// Helper function to record send attempt
async function doRecordSendAttempt(
  ctx: MutationCtx,
  args: {
    phoneNumber: string;
    userId?: string;
    success: boolean;
    ipAddress?: string;
  }
): Promise<null> {
  await ctx.db.insert("otpAttempts", {
    phoneNumber: args.phoneNumber,
    userId: args.userId,
    attemptType: "send" as const,
    timestamp: Date.now(),
    success: args.success,
    ipAddress: args.ipAddress,
  });

  return null;
}

// Helper function to record verify attempt
async function doRecordVerifyAttempt(
  ctx: MutationCtx,
  args: {
    phoneNumber: string;
    userId?: string;
    success: boolean;
    ipAddress?: string;
  }
): Promise<null> {
  await ctx.db.insert("otpAttempts", {
    phoneNumber: args.phoneNumber,
    userId: args.userId,
    attemptType: "verify" as const,
    timestamp: Date.now(),
    success: args.success,
    ipAddress: args.ipAddress,
  });

  // Clean up old attempts to prevent table bloat
  const cleanupThreshold = Date.now() - CLEANUP_THRESHOLD_MS;
  const oldAttempts = await ctx.db
    .query("otpAttempts")
    .withIndex("by_phone_and_timestamp", (q) =>
      q.eq("phoneNumber", args.phoneNumber).lt("timestamp", cleanupThreshold)
    )
    .collect();

  for (const attempt of oldAttempts) {
    await ctx.db.delete(attempt._id);
  }

  return null;
}

/**
 * Check if a phone number can send OTP (rate limiting)
 */
export const canSendOtp = internalQuery({
  args: {
    phoneNumber: v.string(),
    userId: v.optional(v.string()),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    remainingAttempts: v.number(),
    nextAllowedTime: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    return await checkCanSendOtp(ctx, args.phoneNumber);
  },
});

/**
 * Check if a phone number can verify OTP (rate limiting)
 */
export const canVerifyOtp = internalQuery({
  args: {
    phoneNumber: v.string(),
    userId: v.optional(v.string()),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    remainingAttempts: v.number(),
  }),
  handler: async (ctx, args) => {
    return await checkCanVerifyOtp(ctx, args.phoneNumber);
  },
});

/**
 * Record an OTP send attempt
 */
export const recordSendAttempt = internalMutation({
  args: {
    phoneNumber: v.string(),
    userId: v.optional(v.string()),
    success: v.boolean(),
    ipAddress: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await doRecordSendAttempt(ctx, args);
  },
});

/**
 * Record an OTP verification attempt
 */
export const recordVerifyAttempt = internalMutation({
  args: {
    phoneNumber: v.string(),
    userId: v.optional(v.string()),
    success: v.boolean(),
    ipAddress: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await doRecordVerifyAttempt(ctx, args);
  },
});

/**
 * Get rate limit status for a phone number (for client feedback)
 */
export const getRateLimitStatus = internalQuery({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.object({
    canSend: v.boolean(),
    canVerify: v.boolean(),
    sendAttemptsRemaining: v.number(),
    verifyAttemptsRemaining: v.number(),
    nextSendAllowedTime: v.optional(v.number()),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const sendStatus = await checkCanSendOtp(ctx, args.phoneNumber);
    const verifyStatus = await checkCanVerifyOtp(ctx, args.phoneNumber);

    let message: string | undefined;
    if (!sendStatus.allowed) {
      message = sendStatus.reason;
    } else if (!verifyStatus.allowed) {
      message = verifyStatus.reason;
    }

    return {
      canSend: sendStatus.allowed,
      canVerify: verifyStatus.allowed,
      sendAttemptsRemaining: sendStatus.remainingAttempts,
      verifyAttemptsRemaining: verifyStatus.remainingAttempts,
      nextSendAllowedTime: sendStatus.nextAllowedTime,
      message,
    };
  },
});

// Public API functions for client use

/**
 * Check if sending OTP is allowed (public API)
 */
export const checkSendOtpAllowed = query({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    remainingAttempts: v.number(),
    nextAllowedTime: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    return await checkCanSendOtp(ctx, args.phoneNumber);
  },
});

/**
 * Record OTP send attempt (public API)
 */
export const logSendAttempt = mutation({
  args: {
    phoneNumber: v.string(),
    success: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await doRecordSendAttempt(ctx, args);
  },
});

/**
 * Record OTP verification attempt (public API)
 */
export const logVerifyAttempt = mutation({
  args: {
    phoneNumber: v.string(),
    success: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await doRecordVerifyAttempt(ctx, args);
  },
});
