"use node";

import { v } from "convex/values";
import twilio from "twilio";
import { internalAction } from "../_generated/server";

export const verify = internalAction({
  args: {
    phone: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, { code, phone }) => {
    if (process.env.TWILIO_PHONE_NUMBER === undefined) {
      throw new Error("Environment variable TWILIO_PHONE_NUMBER is missing");
    }

    await twilioVerify().verifications.create({
      to: phone,
      channel: "sms",
      customCode: code,
    });

    return { phone, code };
  },
});

export const message = internalAction({
  args: {
    from: v.string(),
    to: v.string(),
    code: v.optional(v.string()),
  },
  handler: async (_ctx, { code, from, to }) => {
    if (code === undefined) {
      throw new Error("Code is required");
    }
    await twilioClient().messages.create({
      from,
      to,
      body: `Your Jym verification code is: ${code}`,
    });
  },
});

function twilioVerify() {
  if (process.env.TWILIO_SERVICE_SID === undefined) {
    throw new Error("Environment variable TWILIO_SERVICE_SID is missing");
  }
  return twilioClient().verify.v2.services(process.env.TWILIO_SERVICE_SID);
}

function twilioClient() {
  if (process.env.TWILIO_ACCOUNT_SID === undefined) {
    throw new Error("Environment variable TWILIO_ACCOUNT_SID is missing");
  }
  if (process.env.TWILIO_AUTH_TOKEN === undefined) {
    throw new Error("Environment variable TWILIO_AUTH_TOKEN is missing");
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}
