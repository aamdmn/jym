# Telegram Authentication Setup Guide

Complete guide to enabling Telegram login for Jym using the telegram-better-auth plugin.

## Overview

This setup allows users to:

1. Sign in to the web app using their Telegram account
2. Automatically link their Telegram ID to their user profile
3. Use the Telegram bot without manual setup

## Prerequisites

- A Telegram bot (already created for the bot functionality)
- A registered domain (e.g., jym.coach)
- Better-auth configured in your backend

## Step 1: Configure Bot Domain

Your bot needs to be linked to your domain to use Telegram Login Widget.

1. **Open @BotFather** in Telegram
2. Send `/mybots`
3. Select your bot
4. Click **Bot Settings**
5. Click **Domain**
6. Send your domain: `jym.coach` (or your actual domain)
7. BotFather will confirm: "Success! Domain set."

## Step 2: Set Environment Variables

### Backend (packages/backend/.env)

Add your Telegram bot token:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Web App (apps/web/.env.local)

Add your bot username:

```bash
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
```

For example, if your bot is `@jym_fitness_bot`, use:

```bash
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=jym_fitness_bot
```

## Step 3: Add Telegram Login to Login Page

Update your login page to include the Telegram login button:

```tsx
// apps/web/src/app/login/page.tsx
import { TelegramLoginButton } from "@/components/telegram-login";

export default function LoginPage() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  return (
    <div>
      {/* Your existing login UI (Google, etc.) */}

      {/* Add Telegram login */}
      {botUsername && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Or continue with Telegram
          </p>
          <TelegramLoginButton
            botUsername={botUsername}
            buttonSize="large"
            cornerRadius={8}
          />
        </div>
      )}
    </div>
  );
}
```

## Step 4: Update Telegram Bot to Check Auth

The bot already checks authentication, but now it will automatically work when users sign in via Telegram Login Widget!

### How It Works

1. **User clicks "Login with Telegram"** on web app
2. **Telegram Login Widget** authenticates the user
3. **better-auth** creates/updates user account with Telegram data
4. **Telegram ID is stored** in the user's account
5. **Bot automatically recognizes** the user when they message it

### Automatic Profile Creation

When a user signs in with Telegram, the system:

- Creates a better-auth user account
- Stores their Telegram ID, name, username, and photo
- Creates a userProfile with `platform: "telegram"`
- Links everything together automatically

## Step 5: Testing

### Test Web Login

1. Go to your web app login page
2. Click the "Login with Telegram" button
3. Telegram will open asking for permission
4. Approve and you'll be logged in
5. Check Convex dashboard - your userProfile should have a `telegramId`

### Test Bot

1. Open Telegram
2. Message your bot: `/start`
3. Bot should recognize you and start the conversation
4. No manual linking needed!

## Architecture

```
User clicks "Login with Telegram"
    ↓
Telegram Login Widget authenticates
    ↓
better-auth receives callback with user data
    ↓
telegram plugin creates/updates user
    ↓
Telegram ID stored in better-auth user data
    ↓
Bot checks Telegram ID against better-auth users
    ↓
User is automatically authenticated in bot
```

## Data Flow

### Web App Login

```typescript
// User clicks Telegram login button
TelegramLoginButton renders widget
    ↓
User approves in Telegram
    ↓
Widget calls onTelegramAuth(user)
    ↓
authClient.signIn.telegram(user)
    ↓
better-auth creates user with Telegram data
    ↓
User redirected to /app
```

### Bot Authentication

```typescript
// User messages bot
Bot receives message with telegramId
    ↓
api.telegram.handleMessage({telegramId, ...})
    ↓
checkUserAuthInternal queries betterAuth users
    ↓
Finds user by Telegram ID
    ↓
Continues with agent conversation
```

## Better-Auth Schema

The telegram plugin automatically manages these fields in the user table:

```typescript
{
  id: string,
  email: string, // Generated: telegram_{id}@jym.coach
  name: string, // From Telegram first_name + last_name
  image: string, // Telegram photo_url
  // ... plus Telegram-specific data
}
```

## Troubleshooting

### Bot Domain Not Set

**Error:** "Bot domain is not set. Use /setdomain in @BotFather"

**Solution:** Follow Step 1 to set your domain

### Button Not Appearing

**Check:**

1. Is `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` set correctly?
2. Is it the username (not the bot name)?
3. Did you restart the Next.js dev server?

### Authentication Fails

**Check:**

1. Is `TELEGRAM_BOT_TOKEN` set in backend?
2. Does the token match the bot used for the login widget?
3. Check Convex logs for errors

### Bot Doesn't Recognize User

**Check:**

1. Did user actually complete web login?
2. Check Convex dashboard - is Telegram ID stored?
3. Verify the Telegram ID matches (check bot console logs)

## Security Notes

### Email Generation

The plugin generates emails like `telegram_123456789@jym.coach`. These are:

- Unique per Telegram ID
- Used internally by better-auth
- Not actual email addresses
- Can't receive mail

### Token Security

- Never commit `TELEGRAM_BOT_TOKEN` to git
- Use different tokens for dev/prod
- Rotate tokens if compromised

### Domain Verification

- Telegram verifies the domain matches
- Login widget only works on configured domain
- Don't use localhost - use ngrok/tunnels for local dev

## Benefits

### For Users

- One-click login with Telegram
- No separate password needed
- Instant bot access after login
- Single identity across web and bot

### For Development

- No manual Telegram ID linking
- Automatic user creation
- Consistent authentication
- Less support burden

## Migration from Manual Linking

If you already have users with manually linked Telegram IDs:

1. **They're safe** - existing userProfiles remain unchanged
2. **New users** - will use automatic Telegram login
3. **Optional** - encourage existing users to re-link via web app

## Next Steps

1. **Style the login button** - Match your app's design
2. **Add user onboarding** - Guide new Telegram users
3. **Profile management** - Let users view/disconnect Telegram
4. **Multi-platform** - Support Telegram + Google login together

## Resources

- [telegram-better-auth GitHub](https://github.com/vitalygashkov/telegram-better-auth)
- [Telegram Login Widget Docs](https://core.telegram.org/widgets/login)
- [Better-auth Docs](https://www.better-auth.com/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
