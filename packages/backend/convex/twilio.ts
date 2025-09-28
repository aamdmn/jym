import { Twilio } from "@convex-dev/twilio";
import { components } from "./_generated/api";
import { action } from "./_generated/server";

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

if (!TWILIO_PHONE_NUMBER) {
  throw new Error("TWILIO_PHONE_NUMBER environment variable is not set");
}

export const twilio = new Twilio(components.twilio, {
  // optionally pass in the default "from" phone number you'll be using
  // this must be a phone number you've created with Twilio
  defaultFrom: TWILIO_PHONE_NUMBER,
});
