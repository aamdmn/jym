# controversial fitness coach telegram bot

a blunt, no-bullshit fitness coach that actually adapts to you. generates workouts, remembers your feedback, and pushes you to get results.

## personality
- always lowercase
- short, punchy messages
- calls out excuses
- swears occasionally
- breaks thoughts into multiple messages
- human-like texting style

## features
- emotional onboarding (starts with pushups)
- adaptive workout generation based on your equipment and level
- remembers your feedback and adjusts future workouts
- tracks your progress and energy patterns
- no generic templates - every workout is personalized

## setup

1. create a telegram bot via [@BotFather](https://t.me/botfather)
2. set up postgresql database
3. create `.env` file:

```bash
# telegram bot token from @BotFather
TELEGRAM_BOT_API_KEY=your_bot_token_here

# postgresql connection
DATABASE_URL=postgresql://user:password@localhost:5432/fitness_coach

# openai api key for workout generation
OPENAI_API_KEY=your_openai_api_key_here
```

4. install dependencies:
```bash
bun install
```

5. run database migrations:
```bash
bun run db:push
```

6. start the bot:
```bash
bun run dev
```

## usage

1. start conversation: `/start`
2. complete onboarding (takes ~2 minutes)
3. request workout: `/workout`
4. give feedback after each session
5. bot adapts based on your responses

## tech stack
- grammy - telegram bot framework
- vercel ai sdk v5 - llm abstraction
- drizzle orm - database
- bun - runtime
- openai gpt-4o-mini - workout generation

## troubleshooting

### bot stops responding during onboarding
- check console logs for errors
- make sure database is running and accessible
- test db connection: `bun run src/test-db.ts`
- if equipment message is too long, bot now handles it properly

### common issues
- **"TELEGRAM_BOT_API_KEY is not set"** - add your bot token to .env
- **"DATABASE_URL is not set"** - add postgresql connection string to .env
- **"OPENAI_API_KEY is not set"** - add openai api key to .env
- **bot doesn't respond** - check if database migrations were run

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
