# ai fitness coach telegram bot

an adaptive fitness coach that gets you moving immediately. powered by ai, feels like texting a friend.

## personality

- always lowercase, no caps
- short punchy messages
- breaks thoughts into multiple messages
- encouraging but real
- gets you moving fast

## features

- instant challenge when you start (no lengthy onboarding)
- adapts difficulty based on your energy
- remembers your conversation context
- human-like typing and message flow
- powered by vercel ai sdk with agent architecture

## setup

1. create a telegram bot via [@BotFather](https://t.me/botfather)
2. get your convex url from the backend package
3. create `.env` file:

```bash
# telegram bot token from @BotFather
TELEGRAM_BOT_API_KEY=your_bot_token_here

# openai api key for ai sdk
OPENAI_API_KEY=your_openai_api_key_here

# convex url for database
CONVEX_URL=your_convex_url_here
```

4. install dependencies:

```bash
bun install
```

5. test the agent locally (optional):

```bash
bun run src/test-bot.ts
```

6. start the bot:

```bash
bun run dev
```

## usage

1. start conversation: `/start` (immediately gives you a challenge)
2. just chat naturally - the bot adapts to you
3. quick workout: `/workout`
4. reset conversation: `/reset`
5. help: `/help`

## tech stack

- grammy - telegram bot framework
- vercel ai sdk - agent framework with tools
- convex - backend database (via monorepo)
- bun - runtime
- openai gpt-4o-mini - llm for conversations

## troubleshooting

### common issues

- **"TELEGRAM_BOT_API_KEY is not set"** - add your bot token to .env
- **"OPENAI_API_KEY is not set"** - add openai api key to .env
- **"CONVEX_URL is not set"** - add convex url to .env
- **bot doesn't respond** - check console logs for errors
- **test locally first** - run `bun run src/test-bot.ts` to test the agent without telegram

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
