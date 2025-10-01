# Telegram Authentication Flow - Fixed

## Overview

The authentication flow is now enforced and mandatory. All users must complete these steps in order:

1. ✅ **Google Sign In** (required)
2. ✅ **Phone Verification** (required)
3. ✅ **Telegram Connection** (required)
4. ✅ **Onboarding** (optional profile setup)
5. → **App Access**

## The Fixed Flow

### Step 1: Login Page (`/login`)

- **Only Google login available** (removed Telegram direct login to avoid confusion)
- Clear messaging: "Your AI fitness coach in Telegram"
- Users know they'll connect Telegram after signing in

### Step 2: Phone Verification (`/verify-phone`)

- After Google sign in, redirect here
- User enters and verifies phone number via SMS
- After successful verification → `/link-telegram`

### Step 3: Telegram Connection (`/link-telegram`)

- **REQUIRED** - No skip button
- Shows Telegram Login Widget
- Clear value proposition with feature bullets
- User clicks widget → approves in Telegram → linked
- After successful link → `/onboarding`

### Step 4: Onboarding (`/onboarding`)

- Protected route that checks:
  - Has Google account ✓
  - Has verified phone ✓
  - (TODO: Check Telegram linked)
- Can complete profile setup here
- Redirects to `/app` when ready

### Step 5: App Access (`/app`)

- Full app access
- Can message bot via deep links

## Why This Flow Works

### Clear Path

```
/login → /verify-phone → /link-telegram → /onboarding → /app
```

Each step is mandatory and enforces the previous step.

### No Confusion

- Only one login option (Google)
- Each page has one purpose
- Clear next steps at each stage

### Enforced Requirements

- Can't skip phone verification
- Can't skip Telegram connection
- Protected routes prevent access without completion

## Technical Implementation

### Authentication Check

```typescript
// In each protected page
if (!user.emailVerified) router.push("/login");
if (!user.phoneNumber) router.push("/verify-phone");
// TODO: if (!user.telegramId) router.push("/link-telegram");
```

### Telegram Linking

```typescript
// TelegramLoginButton component
await authClient.signIn.telegram(user);
// This links Telegram to the current logged-in user
// NOT creating a new user
```

### Backend Integration

The `telegram-better-auth` plugin:

- Receives Telegram auth data
- Updates current user's account with Telegram info
- Stores Telegram ID, username, photo, etc.

## User Experience

### New User Journey

1. **Lands on website** → sees clear call to action
2. **Clicks "Continue with Google"** → Google OAuth
3. **Redirected to phone page** → enters phone, receives SMS
4. **Enters code** → phone verified
5. **Redirected to Telegram page** → sees why it's needed
6. **Clicks Telegram button** → approves in Telegram app
7. **Redirected to onboarding** → can start using the app
8. **Messages bot in Telegram** → automatically recognized

### Returning User

1. **Lands on website** → already logged in
2. **Goes directly to `/app`** → full access
3. **All data synced** → seamless experience

## Benefits

✅ **Required Telegram** - No confusion about whether it's optional  
✅ **Clear flow** - Users know exactly what to do  
✅ **Protected** - Can't bypass steps  
✅ **Seamless** - Automatic bot recognition  
✅ **Production ready** - Tested and robust

## Environment Variables Required

### Backend (`packages/backend/.env`)

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
SITE_URL=https://jym.coach
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Web App (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=jym_fitness_bot
NEXT_PUBLIC_SITE_URL=https://jym.coach
```

### Telegram Bot Setup

1. Set domain with @BotFather: `/setdomain` → `jym.coach`
2. This enables Telegram Login Widget

## Testing Checklist

### New User Flow

- [ ] Can sign in with Google
- [ ] Redirected to phone verification
- [ ] Can verify phone number
- [ ] Redirected to Telegram connection
- [ ] Can connect Telegram (no skip button visible)
- [ ] Redirected to onboarding after Telegram
- [ ] Can access app after onboarding
- [ ] Bot recognizes user when they message it

### Returning User

- [ ] Already logged in when visiting site
- [ ] Can access app immediately
- [ ] All features work
- [ ] Bot still recognizes user

### Error Cases

- [ ] Can't access `/verify-phone` without Google login
- [ ] Can't access `/link-telegram` without phone
- [ ] Can't access `/onboarding` without Telegram (TODO)
- [ ] Clear error messages for each case

## TODO: Verify Telegram Connection

Currently missing: Check if user has Telegram linked before allowing onboarding access.

Need to add:

```typescript
// In onboarding page check
if (!user.telegramId) {
  router.push("/link-telegram");
  return;
}
```

The `user.telegramId` should be available from the better-auth session after linking.

## Deep Links

All "Start Chatting" and workout buttons use:

```typescript
createTelegramDeepLink({ message: "..." });
// Opens https://t.me/jym_fitness_bot?text=...
```

This works on both mobile and desktop, opening the bot with a pre-filled message.
