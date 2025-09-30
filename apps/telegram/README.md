# jym telegram bot

an adaptive fitness coach that gets you moving. powered by ai agents, feels like texting a friend.

## personality

- always lowercase, no caps
- short punchy messages
- breaks thoughts into multiple messages
- encouraging but real
- gets you moving fast

## features

- adaptive workouts based on your energy
- remembers your conversation context through convex agents
- human-like typing and message flow
- persistent memory across sessions
- workout tracking and progress monitoring
- proactive reminders and check-ins

## prerequisites

1. **backend must be running** - the telegram bot connects to the convex backend in `packages/backend`
2. **user must have an account** - users need to sign up at the web app first, then link their telegram

## setup

### 1. create a telegram bot

go to [@BotFather](https://t.me/botfather) and create a new bot:

- send `/newbot`
- choose a name and username
- save the bot token

### 2. configure environment

create `.env` file in `apps/telegram/`:

```bash
# telegram bot token from @BotFather
TELEGRAM_BOT_API_KEY=your_bot_token_here

# openai api key (same as backend)
OPENAI_API_KEY=your_openai_api_key_here

# convex url from backend deployment
CONVEX_URL=https://your-project.convex.cloud
```

### 3. ensure backend is running

from project root:

```bash
cd packages/backend
bun convex dev
```

the backend must be running for the bot to work!

### 4. install dependencies

from `apps/telegram/`:

```bash
bun install
```

### 5. start the bot

```bash
bun run dev
```

the bot will start polling for messages.

## authentication flow

1. user starts the bot with `/start`
2. if not authenticated, bot sends login link: `https://jym.coach/login`
3. user signs up/logs in on web app
4. user needs to link telegram account (currently manual)
5. once linked, bot works normally

## available commands

- `/start` - start or restart the bot
- `/workout` - quick workout session
- `/help` - show help message
- `/reset` - reset conversation (todo)

just text naturally for conversation!

## how it works

1. **long polling** - bot uses grammy's long polling (not webhooks) to receive messages
2. **authentication** - telegram ID is linked to betterauth user in convex
3. **agent selection** - uses onboarding agent or main jym agent based on user status
4. **message parsing** - handles `<multiline>` tags for structured content
5. **typing simulation** - adds natural delays and typing indicators

## message format

the agent uses special formatting:

- new lines = separate message bubbles
- `<multiline>...</multiline>` = single message with line breaks (for exercises, lists, etc.)

example:

```
hey
ready to workout?

<multiline>
pushups next
3 sets of 12
rest 60 seconds
</multiline>
```

becomes:

1. "hey"
2. "ready to workout?"
3. full exercise instructions in one message

## tech stack

- **grammy** - telegram bot framework
- **convex agents** - ai agent orchestration with memory
- **convex** - backend database and functions
- **bun** - runtime and package manager
- **openai gpt-4.1** - language model

## project structure

```
apps/telegram/
├── src/
│   └── index.ts          # main bot implementation
├── package.json
├── tsconfig.json
└── README.md
```

## troubleshooting

### bot doesn't respond

- check console logs for errors
- ensure backend is running (`bun convex dev`)
- verify `CONVEX_URL` matches your deployment
- check telegram bot token is correct

### "user not authenticated"

- user needs to sign up at web app first
- telegram account needs to be linked (check convex dashboard)
- verify userProfiles table has entry with telegramId

### agent errors

- check openai api key is set
- verify convex agents are deployed
- look for errors in convex dashboard logs

### typing delays too long/short

adjust in `sendMessagesWithTyping()` function:

```typescript
const typingDelay = Math.min(Math.max(message.length * 30, 500), 2000);
```

## development

run with hot reload:

```bash
bun run dev
```

build for production:

```bash
bun run build
```

run production build:

```bash
bun run start
```

## deployment

for production, deploy as a long-running service:

- use pm2, systemd, or docker
- ensure stable internet connection
- monitor logs for errors
- set up auto-restart on failure

**note:** webhooks are more efficient for production but require https endpoint. current implementation uses long polling for simplicity.

## next steps

- [ ] implement telegram account linking in web app
- [ ] add `/reset` command to clear thread
- [ ] add webhook support for production
- [ ] handle media messages (photos, voice)
- [ ] add inline keyboards for workout controls
- [ ] implement conversation state management
