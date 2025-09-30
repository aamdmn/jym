# Twilio SMS Integration Setup Guide

This guide will help you set up SMS messaging for Jym using your Canadian Twilio phone number.

## Overview

The SMS integration allows users to interact with Jym via text messages. It works similarly to the WhatsApp and LoopMessage integrations, supporting:

- Two-way SMS conversations
- AI-powered responses using GPT-4
- Onboarding flow for new users
- Workout management and coaching
- Message splitting for better readability

## Prerequisites

- Twilio account with an active phone number (Canadian number)
- Convex deployment URL
- Environment variables configured

## Environment Variables

Make sure you have these environment variables set in your Convex deployment:

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx  # Your Canadian Twilio number
```

You can set these using the Convex CLI:

```bash
npx convex env set TWILIO_ACCOUNT_SID "your_account_sid"
npx convex env set TWILIO_AUTH_TOKEN "your_auth_token"
npx convex env set TWILIO_PHONE_NUMBER "+1xxxxxxxxxx"
```

## Twilio Console Setup

### 1. Find Your Credentials

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Go to your Dashboard
3. Find your **Account SID** and **Auth Token**
4. Copy these values and set them as environment variables (see above)

### 2. Configure Your Phone Number

1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on your Canadian phone number
3. Scroll down to the **Messaging Configuration** section

### 3. Set Up Webhook URL

In the **Messaging Configuration** section:

1. Under **A MESSAGE COMES IN**:
   - Select **Webhook**
   - Enter your webhook URL: `https://your-convex-deployment.convex.site/sms/webhook`
   - HTTP Method: **POST**
2. (Optional) Under **STATUS CALLBACK URL**:
   - Enter: `https://your-convex-deployment.convex.site/sms/status` (if you want delivery status updates)
   - HTTP Method: **POST**

3. Click **Save** at the bottom of the page

### 4. Find Your Convex Deployment URL

To find your Convex deployment URL:

```bash
npx convex run --help
```

Or check your Convex dashboard. The webhook URL should be:

```
https://<your-deployment-name>.convex.site/sms/webhook
```

Example:

```
https://happy-bear-123.convex.site/sms/webhook
```

## Testing the Integration

### 1. Send a Test Message

From any phone, send a text message to your Twilio Canadian number:

```
Hello Jym!
```

### 2. Check Convex Logs

Monitor your Convex logs to see the webhook processing:

```bash
npx convex logs
```

You should see logs like:

- "Twilio SMS webhook received"
- "Processing Twilio SMS webhook"
- "Found authenticated user" (if user is logged in)
- "SMS sent successfully"

### 3. Expected Behavior

**For unauthenticated users:**

- User sends: "Hi"
- Jym responds: "hello human! 👋 before we start please login: https://jym.coach/login"

**For authenticated users (not onboarded):**

- User sends: "Hi"
- Jym starts onboarding conversation

**For authenticated users (onboarded):**

- User sends: "I want to workout"
- Jym generates personalized workout and coaching

## Troubleshooting

### Messages Not Being Received

1. **Check webhook configuration in Twilio Console**
   - Ensure the webhook URL is correct
   - Verify HTTP method is POST
   - Check that the phone number's messaging is properly configured

2. **Check Convex logs**

   ```bash
   npx convex logs --tail
   ```

   - Look for "Twilio SMS webhook received" messages
   - Check for any error messages

3. **Verify environment variables**

   ```bash
   npx convex env list
   ```

   - Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set

### Messages Not Being Sent

1. **Check Twilio credentials**
   - Verify Account SID and Auth Token are correct
   - Check that your Twilio account has sufficient balance

2. **Check Twilio logs**
   - Go to Twilio Console → Monitor → Logs → Messaging
   - Look for failed messages and error codes

3. **Verify phone number format**
   - Ensure TWILIO_PHONE_NUMBER includes the + prefix
   - Example: `+15551234567` (not `15551234567`)

### User Not Found Errors

1. **Check phone number format in database**
   - Phone numbers should be stored with + prefix
   - Example: `+15551234567`

2. **Verify user authentication**
   - User must login through the web app first
   - Phone number must match exactly between Twilio and betterAuth

### Media/MMS Messages Not Supported

Currently, the integration only supports text messages. If users send images or media:

- They'll receive: "sorry, i can only read text messages for now! 📱"
- To add media support, you'll need to process the `NumMedia` and `MediaUrl0`, `MediaUrl1`, etc. fields

## Message Flow

1. **User sends SMS** → Twilio receives it
2. **Twilio webhook** → Posts to `/sms/webhook`
3. **Convex processes** → `sms.ts:processIncomingMessage`
4. **User authentication** → Checks betterAuth for user
5. **Agent generation** → Creates response using appropriate agent
6. **Message splitting** → Splits long messages for readability
7. **SMS sending** → Sends via Twilio API with realistic delays

## Features

### Message Splitting

Long responses are automatically split into multiple SMS messages:

- Supports `<multiline>` tags for preserving formatting
- Adds realistic typing delays between messages
- Splits on newlines for better readability

### Multiline Tag Support

To preserve formatting in agent responses, use `<multiline>` tags:

```
Here's your workout:
<multiline>
Exercise 1: Push-ups
Sets: 3
Reps: 12
</multiline>
Remember to warm up first!
```

This will be sent as 3 separate messages with proper formatting preserved in the middle message.

### Platform Tracking

User profiles automatically track which platform they're using:

- `platform: "sms"` for SMS users
- `platform: "whatsapp"` for WhatsApp users
- `platform: "loopmessage"` for iMessage users

## Cost Considerations

SMS messaging has costs associated with both inbound and outbound messages:

- **Inbound SMS**: ~$0.0075 per message (Canadian numbers)
- **Outbound SMS**: ~$0.0075 per message (Canadian numbers)
- Check [Twilio Pricing](https://www.twilio.com/en-us/sms/pricing/ca) for current rates

The message splitting feature helps create a better user experience but does increase the number of messages sent. Monitor your Twilio usage in the console.

## Next Steps

1. Test the integration thoroughly with various scenarios
2. Set up monitoring/alerting for failed messages
3. Consider implementing message queueing for high volume
4. Add support for MMS/media messages if needed
5. Implement opt-out/STOP functionality (required for SMS compliance)

## Compliance Notes

For production SMS messaging, ensure you comply with:

- **TCPA** (Telephone Consumer Protection Act)
- **CAN-SPAM Act** requirements
- **CTIA** (Cellular Telecommunications Industry Association) guidelines
- Obtain proper consent before sending marketing messages
- Implement STOP/UNSUBSCRIBE functionality
- Include opt-out instructions in messages

Twilio provides guidelines: https://www.twilio.com/docs/sms/compliance

## Support

For issues:

1. Check Convex logs: `npx convex logs`
2. Check Twilio logs: [Twilio Console → Monitor → Logs](https://console.twilio.com/us1/monitor/logs/sms)
3. Review this documentation
4. Check the codebase: `packages/backend/convex/sms.ts`
