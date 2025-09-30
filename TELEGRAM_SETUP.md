# Telegram Bot Setup Guide

Complete guide to setting up and running the Jym Telegram bot.

## Quick Start

### 1. Backend Setup

First, ensure your Convex backend is running:

```bash
cd packages/backend
bun install
bun convex dev
```

Keep this terminal running - the backend must be active for the bot to work.

### 2. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow prompts to:
   - Choose a name (e.g., "Jym Fitness Coach")
   - Choose a username (e.g., "jym_fitness_bot")
4. Save the bot token (looks like `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. Configure Environment

Create `apps/telegram/.env`:

```bash
# From BotFather
TELEGRAM_BOT_API_KEY=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Same as backend
OPENAI_API_KEY=sk-...

# From Convex dashboard or terminal
CONVEX_URL=https://your-project.convex.cloud
```

### 4. Start Bot

```bash
cd apps/telegram
bun install
bun run dev
```

You should see:

```
🏃 jym fitness coach bot starting...
💪 ready to get people moving!
🤖 connected to convex at https://...
```

## Testing the Bot

### Manual Testing Flow

1. **Start the bot**
   - Open Telegram
   - Search for your bot username
   - Send `/start`

2. **Expected Response** (for unauthenticated user):

   ```
   hey there! 👋

   before we start, you need to create an account:

   https://jym.coach/login

   once you're logged in, come back and /start again
   ```

3. **Create Account**
   - Go to https://jym.coach/login
   - Sign up with Google
   - Add phone number
4. **Link Telegram Account** (currently manual)

   Open Convex dashboard and add to `userProfiles` table:

   ```js
   {
     userId: "user_...", // from betterAuth users table
     telegramId: 123456789, // your telegram ID
     platform: "telegram",
     onboardingComplete: false,
     fitnessLevel: "",
     goals: "",
     equipment: "",
     injuries: "",
     mesuringSystem: "metric"
   }
   ```

5. **Test Again**
   - Send `/start` in Telegram
   - Bot should now go through onboarding

### Finding Your Telegram ID

Send any message to the bot and check the console logs:

```
Message from username: hello
```

The telegram ID will be in the logs.

## Bot Commands

- `/start` - Start or restart conversation
- `/workout` - Quick workout session
- `/help` - Show help message
- `/reset` - Reset conversation (WIP)

## Architecture Overview

```
Telegram User
    ↓
Telegram API (long polling)
    ↓
grammy Bot Framework
    ↓
Convex Functions (telegram.ts)
    ↓
Convex Agents (agents.ts)
    ↓
OpenAI GPT-4.1
    ↓
Response
    ↓
User receives messages
```

## Message Flow

### 1. User sends message

```typescript
bot.on("message:text", async (ctx) => {
  // Check auth
  // Call convex.action(internal.telegram.generateResponse)
  // Parse response messages
  // Send with typing simulation
});
```

### 2. Backend processes

```typescript
generateResponse(ctx, {userId, telegramId, messageText}) {
  // Find or create thread
  // Check onboarding status
  // Select appropriate agent
  // Run agent with user message
  // Return response messages
}
```

### 3. Message parsing

```typescript
parseMessages("<multiline>exercise\ndetails</multiline>\nnext message");
// Returns: ["exercise\ndetails", "next message"]
```

### 4. Typing simulation

```typescript
sendMessagesWithTyping(messages) {
  for (message of messages) {
    await ctx.replyWithChatAction("typing")
    await delay(calculatedDelay)
    await ctx.reply(message)
    await delay(300)
  }
}
```

## Common Issues

### Bot Not Responding

**Check 1:** Backend running?

```bash
cd packages/backend
bun convex dev
```

**Check 2:** Correct CONVEX_URL?

```bash
# Should match backend deployment
echo $CONVEX_URL
```

**Check 3:** Bot token valid?

```bash
# Test with curl
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

### "User Not Authenticated"

**Issue:** User profile not linked to telegram ID

**Solution:**

1. User must sign up at web app first
2. Manually add telegram ID to userProfiles table
3. Future: Implement automatic linking

### Agent Errors

**Check 1:** OpenAI API key set?

```bash
echo $OPENAI_API_KEY
```

**Check 2:** Convex agents deployed?

```bash
cd packages/backend
bun convex deploy
```

**Check 3:** Check Convex logs

- Go to Convex dashboard
- Click "Logs"
- Look for errors in `telegram.generateResponse`

### Type Errors

**Issue:** Can't find `internal.telegram.*`

**Solution:** Regenerate Convex types

```bash
cd packages/backend
bun convex dev  # This regenerates types
```

## Development Tips

### Debug Mode

Add logging to see what's happening:

```typescript
// In bot
console.log("Auth check:", authCheck);
console.log("Response:", response);
console.log("Parsed messages:", allMessages);
```

### Test Message Parsing

```typescript
const test = "hey\nready?\n<multiline>exercise\n3x10</multiline>\nlater";
console.log(parseMessages(test));
// ["hey", "ready?", "exercise\n3x10", "later"]
```

### Monitor Backend

Watch Convex logs in real-time:

```bash
cd packages/backend
bun convex dev
# Logs will show function calls
```

### Check Database

Use Convex dashboard to inspect:

- `userProfiles` - check telegram ID linking
- `threads` - verify conversation threads
- `workouts` - see generated workouts

## Production Deployment

### Using Long Polling (Current)

**Pros:**

- Simple setup
- No HTTPS required
- Works everywhere

**Cons:**

- Constant connection needed
- Higher latency
- More resource usage

**Deploy with:**

- PM2: `pm2 start bun --name telegram-bot -- run start`
- Docker: See Dockerfile example below
- Systemd: See service file example below

### Using Webhooks (Recommended for Production)

**Pros:**

- More efficient
- Lower latency
- Better scaling

**Cons:**

- Needs HTTPS endpoint
- More complex setup

**Setup:**

```typescript
// Replace bot.start() with:
const webhookCallback = webhookCallback(bot, "bun");

Bun.serve({
  port: 3000,
  fetch: webhookCallback,
});

// Set webhook
await bot.api.setWebhook("https://your-domain.com/telegram-webhook");
```

## Docker Deployment

```dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy workspace files
COPY package.json bun.lock ./
COPY apps/telegram ./apps/telegram
COPY packages ./packages

# Install dependencies
RUN bun install

# Build bot
WORKDIR /app/apps/telegram
RUN bun run build

# Start
CMD ["bun", "run", "start"]
```

## Systemd Service

```ini
[Unit]
Description=Jym Telegram Bot
After=network.target

[Service]
Type=simple
User=jym
WorkingDirectory=/opt/jym/apps/telegram
Environment="TELEGRAM_BOT_API_KEY=..."
Environment="OPENAI_API_KEY=..."
Environment="CONVEX_URL=..."
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable jym-telegram
sudo systemctl start jym-telegram
sudo systemctl status jym-telegram
```

## Monitoring

### Logs

```bash
# PM2
pm2 logs telegram-bot

# Docker
docker logs -f telegram-bot

# Systemd
journalctl -u jym-telegram -f
```

### Health Checks

Add to bot:

```typescript
// Health check endpoint (if using webhooks)
bot.hears("/health", (ctx) => ctx.reply("healthy"));
```

### Metrics

Monitor:

- Message response time
- Agent errors
- User authentication failures
- Convex function execution time

## Security

### Environment Variables

Never commit `.env` files:

```gitignore
.env
.env.*
!.env.example
```

### Bot Token

- Keep secret
- Rotate if exposed
- Use different tokens for dev/prod

### Rate Limiting

Add to bot if needed:

```typescript
import { limit } from "@grammyjs/ratelimiter";

bot.use(
  limit({
    timeFrame: 2000,
    limit: 3,
  })
);
```

## Future Improvements

- [ ] Automatic telegram account linking
- [ ] Webhook support for production
- [ ] Inline keyboards for workout controls
- [ ] Media support (photos, voice notes)
- [ ] Group chat support
- [ ] Admin commands
- [ ] Analytics and tracking
- [ ] Multi-language support

## Support

Having issues? Check:

1. This guide's troubleshooting section
2. Console logs (bot and backend)
3. Convex dashboard logs
4. grammy documentation: https://grammy.dev
5. Project README files
