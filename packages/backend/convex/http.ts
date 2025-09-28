import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { twilio } from "./twilio";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

twilio.registerRoutes(http);

// LoopMessage webhook endpoint for incoming iMessage messages
http.route({
  path: "/loopmessage/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();

      console.log("LoopMessage webhook received:", body);

      // Handle different webhook alert types
      if (body.alert_type !== "message_inbound") {
        // Handle non-inbound message types (sent, failed, reaction, etc.)
        await ctx.runAction(internal.loopmessage.handleWebhookAlertType, {
          webhookData: body,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      // Process inbound messages and get response instructions
      const result = await ctx.runMutation(
        internal.loopmessage.processIncomingMessage,
        {
          webhookData: body,
        }
      );

      // Build response based on processing result
      const response: Record<string, any> = { success: true };

      if (result.shouldRespond) {
        if (result.typing) {
          response.typing = result.typing;
        }
        if (result.read) {
          response.read = result.read;
        }
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error processing LoopMessage webhook:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  }),
});

export default http;
