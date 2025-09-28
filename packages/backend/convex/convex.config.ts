import agent from "@convex-dev/agent/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
import twilio from "@convex-dev/twilio/convex.config";
import autumn from "@useautumn/convex/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();

app.use(agent);
app.use(betterAuth);
app.use(twilio);
app.use(autumn);

export default app;
