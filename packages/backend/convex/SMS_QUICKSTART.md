# SMS Integration Quick Start

Get your Jym SMS integration up and running in 5 minutes!

## 🚀 Quick Setup

### 1. Set Environment Variables

```bash
npx convex env set TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npx convex env set TWILIO_AUTH_TOKEN "your_auth_token_here"
npx convex env set TWILIO_PHONE_NUMBER "+1xxxxxxxxxx"
```

> **Where to find these:**
>
> - Login to [Twilio Console](https://console.twilio.com/)
> - Account SID and Auth Token are on your Dashboard
> - Phone Number is in Phone Numbers → Manage → Active Numbers

### 2. Deploy to Convex

```bash
cd packages/backend
npx convex dev
```

### 3. Get Your Webhook URL

Your webhook URL will be:

```
https://<your-deployment>.convex.site/sms/webhook
```

Find your deployment name in the Convex dashboard or from the deploy output.

### 4. Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to: **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your Canadian phone number
4. Scroll to **Messaging Configuration**
5. Under **A MESSAGE COMES IN**:
   - Select: **Webhook**
   - Enter: `https://<your-deployment>.convex.site/sms/webhook`
   - HTTP Method: **POST**
6. Click **Save**

### 5. Test It! 🎉

Send a text message to your Twilio number:

```
Hello Jym!
```

**Expected behavior:**

- **New user (not logged in):**

  ```
  hello human! 👋 before we start please login:

  https://jym.coach/login
  ```

- **Logged in user:**
  - Starts onboarding if not complete
  - Begins coaching conversation if onboarded

### 6. Monitor Logs

Watch the magic happen:

```bash
npx convex logs --tail
```

Look for:

- ✅ "Twilio SMS webhook received"
- ✅ "Processing Twilio SMS webhook"
- ✅ "SMS sent successfully"

## 🔧 Troubleshooting

### Not receiving messages?

**Check webhook URL:**

```bash
# Verify it's set correctly in Twilio Console
# Format: https://your-deployment.convex.site/sms/webhook
```

**Check environment variables:**

```bash
npx convex env list
```

Should show:

- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

**Check Convex logs:**

```bash
npx convex logs --tail
```

If you don't see "Twilio SMS webhook received", the webhook isn't reaching Convex.

### Not sending messages?

**Check Twilio credentials:**

- Verify Account SID and Auth Token are correct
- Check Twilio account balance (needs funds for sending)

**Check Convex logs for errors:**

```bash
npx convex logs | grep -i error
```

**Verify phone number format:**

- Must include `+` prefix
- Example: `+15551234567` ✅
- Wrong: `15551234567` ❌

### User not found errors?

Users must:

1. Sign up on your web app first
2. Verify their phone number
3. Phone number must match exactly (including + prefix)

## 📱 How It Works

```
User sends SMS
    ↓
Twilio receives message
    ↓
Twilio posts to /sms/webhook
    ↓
Convex processes message
    ↓
Check user authentication
    ↓
Generate AI response
    ↓
Send via Twilio API
    ↓
User receives response
```

## 💡 Key Features

### ✨ Message Splitting

Long responses are automatically split into multiple SMS:

```
Message 1: "Here's your workout!"
Message 2: "Push-ups: 3 sets of 12"
Message 3: "Rest for 60 seconds between sets"
```

### ⏱️ Realistic Delays

Messages are sent with human-like typing delays for better UX.

### 🤖 Smart Agent Selection

- **New users** → Onboarding agent
- **Returning users** → Main coaching agent

### 📝 Conversation History

All conversations are stored and threaded per user.

## 🎯 Next Steps

1. ✅ Test with your phone number
2. ✅ Test the onboarding flow
3. ✅ Test workout creation
4. ✅ Monitor logs for any issues
5. 📊 Set up monitoring for production
6. 💰 Set up billing alerts in Twilio

## 📚 Additional Resources

- **Full Setup Guide:** `SMS_SETUP.md`
- **Platform Comparison:** `MESSAGING_PLATFORMS.md`
- **Twilio Docs:** https://www.twilio.com/docs/sms
- **Code:** `packages/backend/convex/sms.ts`

## 🆘 Need Help?

1. Check the logs: `npx convex logs --tail`
2. Check Twilio logs: [Twilio Console → Monitor → Logs](https://console.twilio.com/us1/monitor/logs/sms)
3. Review `SMS_SETUP.md` for detailed troubleshooting
4. Check existing implementations: `loopmessage.ts`, `whatsapp.ts`

## 🎉 You're All Set!

Your SMS integration is ready to go! Users can now text your Twilio number and get personalized fitness coaching from Jym.

**Pro tip:** Start with a small test group before rolling out to all users to ensure everything works smoothly.
