# WhatsApp Integration Setup Guide

This guide will help you set up WhatsApp Business API integration for Jym.

## Prerequisites

1. A Meta Business Account
2. A Meta Developer Account
3. A WhatsApp Business Account
4. A phone number to use with WhatsApp Business API

## Step 1: Create a WhatsApp Business App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click on "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in your app details and create the app
5. From the dashboard, add the "WhatsApp" product to your app

## Step 2: Get Your Credentials

### Access Token

1. In your app dashboard, go to WhatsApp → API Setup
2. Scroll down to "Temporary access token" (for testing)
3. Copy the access token
4. For production, you'll need to create a System User and generate a permanent token:
   - Go to Business Settings → System Users
   - Create a new system user or use an existing one
   - Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions

### Phone Number ID

1. In WhatsApp → API Setup, you'll see a "From" phone number
2. Click on it to see the Phone Number ID
3. Copy this ID (it's a numeric string)

### App ID and App Secret

1. Go to Settings → Basic in your app dashboard
2. Copy the App ID and App Secret

## Step 3: Configure Webhook

1. In your app dashboard, go to WhatsApp → Configuration
2. In the "Webhook" section, click "Configure webhooks" or "Edit"
3. Enter your webhook URL:

   ```
   https://your-convex-deployment-url.convex.site/whatsapp/webhook
   ```

   To get your Convex deployment URL:
   - Run `npx convex dev` in your terminal
   - Look for the deployment URL in the output
   - Or check your Convex dashboard

4. Enter a Verify Token (you can create any string, e.g., "jym-whatsapp-verify-token")
5. Click "Verify and save"

6. Subscribe to webhook fields:
   - Make sure you're subscribed to "messages" field
   - Optionally subscribe to other fields like "message_status", "messaging_postback", etc.

## Step 4: Set Environment Variables in Convex

Add these environment variables to your Convex deployment:

```bash
# WhatsApp Access Token (required)
npx convex env set WHATSAPP_ACCESS_TOKEN "your-access-token-here"

# WhatsApp Phone Number ID (required)
npx convex env set WHATSAPP_PHONE_NUMBER_ID "your-phone-number-id-here"

# WhatsApp Verify Token (required - must match what you entered in webhook config)
npx convex env set WHATSAPP_VERIFY_TOKEN "jym-whatsapp-verify-token"

# WhatsApp API Version (optional, defaults to v21.0)
npx convex env set WHATSAPP_API_VERSION "v21.0"
```

## Step 5: Test Your Integration

### Test with Meta's Test Number

1. In WhatsApp → API Setup, you'll see a test number provided by Meta
2. You can send test messages to this number
3. Add your personal phone number to the "To" field
4. Send a test message from the dashboard
5. Reply to that message from your phone

### Monitor Webhooks

1. Check your Convex logs to see incoming webhooks:

   ```bash
   npx convex logs
   ```

2. You should see logs like:
   ```
   WhatsApp webhook received: {...}
   Processing text message from +1234567890: Hello
   ```

### Send Your First Message

1. Make sure your phone number is registered in your system (via login)
2. Send a message to your WhatsApp Business number
3. The bot should respond!

## Step 6: Production Setup

### Get a Permanent Access Token

1. Go to Business Settings in Meta Business Suite
2. Navigate to System Users
3. Create or select a system user
4. Click "Add Assets" and add your WhatsApp Business Account
5. Click "Generate New Token"
6. Select your app and choose permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
7. Copy the token and update your environment variable:
   ```bash
   npx convex env set WHATSAPP_ACCESS_TOKEN "your-permanent-token" --prod
   ```

### Request Production Access

1. Complete your app development
2. Fill in required app information in App Review
3. Request production access for WhatsApp Business
4. Wait for Meta's approval

### Verify Your Business

1. Complete Business Verification in Meta Business Suite
2. This is required for production access

## Webhook Payload Structure

### Incoming Message

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "USER_NAME"
                },
                "wa_id": "WHATSAPP_ID"
              }
            ],
            "messages": [
              {
                "from": "SENDER_PHONE_NUMBER",
                "id": "MESSAGE_ID",
                "timestamp": "TIMESTAMP",
                "type": "text",
                "text": {
                  "body": "MESSAGE_BODY"
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Status Update

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "statuses": [
              {
                "id": "MESSAGE_ID",
                "status": "delivered",
                "timestamp": "TIMESTAMP",
                "recipient_id": "RECIPIENT_PHONE_NUMBER"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Webhook Verification Fails

- Check that your verify token matches in both Meta configuration and Convex environment
- Ensure your webhook URL is correct and accessible
- Check Convex logs for any errors

### Messages Not Being Received

- Verify your webhook is subscribed to the "messages" field
- Check that the phone number is registered in your system
- Look at Convex logs to see if webhooks are being received
- Ensure your access token is valid

### Messages Not Being Sent

- Verify your access token has the correct permissions
- Check that the phone number ID is correct
- Ensure the recipient phone number is in the correct format (E.164)
- Check for rate limits (Meta has limits on message sending)

### Rate Limits

WhatsApp Business API has rate limits:

- **Tier 1**: 1,000 business-initiated conversations per day
- **Tier 2**: 10,000 business-initiated conversations per day
- **Tier 3**: 100,000 business-initiated conversations per day
- **Tier 4**: Unlimited

You can increase your tier by maintaining good quality and messaging practices.

## Security Best Practices

1. **Never commit access tokens** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate tokens regularly** in production
4. **Monitor webhook requests** for suspicious activity
5. **Validate webhook signatures** (not implemented in basic version)
6. **Implement rate limiting** on your end to prevent abuse

## Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Cloud API Getting Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [Convex Documentation](https://docs.convex.dev/)

## Migration from LoopMessage

If you're migrating from LoopMessage, note these differences:

1. **Phone Number Format**: WhatsApp uses E.164 format strictly
2. **Message Structure**: Different webhook payload structure
3. **No Typing Indicators**: WhatsApp doesn't support typing indicators in the same way
4. **Media Support**: WhatsApp has different media handling (not implemented in basic version)
5. **Platform Field**: Update user profiles to reflect "whatsapp" instead of "loopmessage"

## Future Enhancements

Potential features to add:

- Media message support (images, videos, documents)
- Template message support for business-initiated conversations
- Interactive messages (buttons, lists)
- Webhook signature verification for security
- Message reactions and replies
- Read receipts
- Better error handling and retry logic
