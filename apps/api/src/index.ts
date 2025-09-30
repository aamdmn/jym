import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/webhook/message", async (c) => {
  const {
    text: userMessage,
    recipient,
    alert_type,
  } = await c.req.json<{
    text: string;
    recipient: string;
    alert_type: string;
  }>();

  // Only respond to inbound messages from users
  if (alert_type !== "message_inbound") {
    return c.text("Webhook received but not an inbound message", {
      status: 200,
    });
  }

  const { text } = await generateText({
    model: openai("gpt-4.1-nano"),
    system:
      "You are a helpful assistant. Respond in lowercase and in direct and short sentences.",
    prompt: userMessage,
  });

  const res = await fetch(
    "https://server.loopmessage.com/api/v1/message/send",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "TMQTID8CB-J8BTOGCNC-JNZ611DOJ-0JZKR0LD3",
        "Loop-Secret-Key":
          "gSN1pS_znHDdFoLbfBpbdbfNlt3DaLpgAOXmiDyh6gi3kQ_jLR83-RVdJBG115TN",
      },
      body: JSON.stringify({
        recipient,
        text,
      }),
    }
  ).then((response) => response.json());

  console.log(res);

  return c.text("OK", {
    status: 200,
  });
});

export default {
  port: 3001,
  fetch: app.fetch,
};
