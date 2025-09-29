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
      const response: Record<string, string | number | boolean> = {
        success: true,
      };

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

// WhatsApp webhook verification endpoint (GET)
// Meta will send a verification request when you configure the webhook
http.route({
  path: "/whatsapp/webhook",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    try {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("WhatsApp webhook verification request:", {
        mode,
        token,
        challenge,
      });

      // Verify token from environment variable
      const verifyToken =
        process.env.WHATSAPP_VERIFY_TOKEN || "jym-whatsapp-verify-token";

      if (mode === "subscribe" && token === verifyToken) {
        console.log("Webhook verified successfully");
        return new Response(challenge, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      console.error("Webhook verification failed");
      return new Response("Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    } catch (error) {
      console.error("Error verifying WhatsApp webhook:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
  }),
});

// WhatsApp webhook endpoint for incoming messages (POST)
http.route({
  path: "/whatsapp/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();

      console.log("WhatsApp webhook received:", JSON.stringify(body, null, 2));

      // Check if this is a status update or a message
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle status updates (message sent, delivered, read, failed)
      if (value?.statuses) {
        await ctx.runAction(internal.whatsapp.handleStatusUpdate, {
          webhookData: body,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      // Handle incoming messages
      if (value?.messages) {
        const result = await ctx.runMutation(
          internal.whatsapp.processIncomingMessage,
          {
            webhookData: body,
          }
        );

        return new Response(JSON.stringify({ success: result.shouldRespond }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      // Unknown webhook type
      console.log("Unknown WhatsApp webhook type");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
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
