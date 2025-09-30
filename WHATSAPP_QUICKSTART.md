# WhatsApp Integration - Quick Start Guide

## 🚀 What's Been Created

A complete WhatsApp Business API integration for Jym that mirrors your existing LoopMessage implementation.

### New Files

- **`packages/backend/convex/whatsapp.ts`** - Main WhatsApp integration (messages, responses, splitting)
- **`packages/backend/convex/WHATSAPP_SETUP.md`** - Complete setup instructions
- **`packages/backend/convex/WHATSAPP_VS_LOOPMESSAGE.md`** - Comparison guide
- **`packages/backend/convex/test_whatsapp.ts`** - Testing utilities

### Updated Files

- **`packages/backend/convex/http.ts`** - Added WhatsApp webhook endpoints (GET & POST)

## 🎯 Quick Setup (5 Steps)

### 1. Get Your WhatsApp Credentials

From [Meta for Developers](https://developers.facebook.com/):

1. Create/select your WhatsApp Business app
2. Go to **WhatsApp → API Setup**
3. Copy the **Access Token** (temporary or permanent)
4. Copy the **Phone Number ID**

### 2. Set Environment Variables

```bash
# In your terminal, run these commands:
npx convex env set WHATSAPP_ACCESS_TOKEN "YOUR_ACCESS_TOKEN_HERE"
npx convex env set WHATSAPP_PHONE_NUMBER_ID "YOUR_PHONE_NUMBER_ID_HERE"
npx convex env set WHATSAPP_VERIFY_TOKEN "jym-whatsapp-verify-token"
```

### 3. Get Your Webhook URL

```bash
# Start Convex dev server
npx convex dev

# Your webhook URL will be:
# https://your-deployment-url.convex.site/whatsapp/webhook
```

### 4. Configure Webhook in Meta

1. Go to **WhatsApp → Configuration** in Meta Developer Console
2. Click **Edit** in the Webhook section
3. Enter:
   - **Callback URL**: `https://your-deployment-url.convex.site/whatsapp/webhook`
   - **Verify Token**: `jym-whatsapp-verify-token` (same as step 2)
4. Click **Verify and Save**
5. Subscribe to **messages** field

### 5. Test It!

```bash
# Check environment
npx convex run test_whatsapp:checkEnvironment

# Send a test message from WhatsApp to your business number
# The bot should respond!

# Monitor logs
npx convex logs
```

## ✨ Key Features

✅ **Identical to LoopMessage** - Same message handling, splitting, and agent logic  
✅ **User Authentication** - Checks betterAuth before responding  
✅ **Smart Agent Selection** - Uses onboarding or main agent based on user status  
✅ **Message Splitting** - Handles multiline tags with realistic typing delays  
✅ **Error Handling** - Graceful fallbacks for all error cases  
✅ **Status Tracking** - Logs message delivery, read receipts, failures  
✅ **Phone Validation** - Strict E.164 format checking

## 📱 How It Works

```
WhatsApp Message → Meta → Your Webhook → Convex
                                          ↓
                                    Authenticate User
                                          ↓
                                    Check Onboarding
                                          ↓
                                    Select Agent
                                          ↓
                                    Generate Response
                                          ↓
                                    Split Messages
                                          ↓
Meta ← WhatsApp ← User ← Send via API ← Format
```

## 🧪 Testing Commands

```bash
# Check environment variables
npx convex run test_whatsapp:checkEnvironment

# Simulate incoming message (for debugging)
npx convex run test_whatsapp:testIncomingMessage \
  --phoneNumber "+1234567890" \
  --message "Hello"

# Test sending a message
npx convex run test_whatsapp:testSendMessage \
  --phoneNumber "+1234567890" \
  --message "Test from Jym"

# Test split messages
npx convex run test_whatsapp:testSplitMessages \
  --phoneNumber "+1234567890"

# Get user conversation
npx convex run test_whatsapp:testGetConversation \
  --userId "user_id_here"
```

## 🔧 Common Issues

### Webhook Verification Fails

```bash
# Make sure your verify token matches
npx convex env set WHATSAPP_VERIFY_TOKEN "jym-whatsapp-verify-token"

# Check the logs
npx convex logs
```

### Messages Not Received

1. Verify webhook is subscribed to "messages" field in Meta console
2. Check user is logged in with correct phone number
3. Monitor Convex logs for incoming webhooks

### Can't Send Messages

1. Verify access token is valid: `npx convex run test_whatsapp:checkEnvironment`
2. Check phone number format (must be E.164: `+1234567890`)
3. Ensure phone number ID is correct

## 📊 Comparison with LoopMessage

| Feature              | LoopMessage  | WhatsApp         |
| -------------------- | ------------ | ---------------- |
| Platform             | iMessage/SMS | WhatsApp         |
| Typing Indicators    | ✅ Yes       | ❌ No            |
| Message Splitting    | ✅ Yes       | ✅ Yes           |
| Authentication       | ✅ Yes       | ✅ Yes           |
| Agent Selection      | ✅ Yes       | ✅ Yes           |
| Webhook Verification | ❌ No        | ✅ Required      |
| Read Receipts        | ✅ Outbound  | ❌ Outbound only |

## 📚 Next Steps

1. **Test thoroughly** with your phone number
2. **Request production access** from Meta (for higher rate limits)
3. **Complete Business Verification** (required for production)
4. **Get permanent access token** (temp tokens expire after 24h)
5. **Consider media support** (images, videos - not yet implemented)

## 💡 Pro Tips

- **Rate Limits**: Start at 1K conversations/day, increases with good quality
- **Business-Initiated**: Need approved templates for conversations you start
- **Phone Format**: Always use E.164 format (`+1234567890`)
- **Testing**: Use Meta's test numbers before going production
- **Logs**: Monitor `npx convex logs` during development

## 🆘 Need Help?

- **Setup Guide**: `packages/backend/convex/WHATSAPP_SETUP.md`
- **Comparison**: `packages/backend/convex/WHATSAPP_VS_LOOPMESSAGE.md`
- **WhatsApp Docs**: https://developers.facebook.com/docs/whatsapp
- **Convex Docs**: https://docs.convex.dev

## 🎉 You're Ready!

Your WhatsApp integration is set up and ready to handle fitness coaching conversations just like LoopMessage. Send a message and watch it work! 💪
