# LoopMessage Integration Setup

This setup enables Jym to receive and respond to iMessage messages via LoopMessage webhooks using Convex agents with thread-based context management.

## Architecture Overview

1. **Webhook Endpoint**: `/loopmessage/webhook` receives incoming iMessage messages
2. **Simple User Management**: Phone numbers serve as user IDs, instant profile creation
3. **Fast Processing**: Immediate user creation and response generation
4. **Thread Management**: Convex agents handle conversation context per phone number
5. **Agent Integration**: jymAgent generates contextual fitness coaching responses
6. **Response Delivery**: Sends replies back via LoopMessage API with typing indicators

## Database Schema

The integration uses:

- **User Profiles Table**: Simple profiles with phone numbers as user IDs
- **Convex Agents**: Thread and message management for conversation context
- **BetterAuth**: Reserved for Next.js web app authentication (separate from webhooks)

## Environment Variables Required

Add these to your Convex environment:

```bash
LOOPMESSAGE_AUTH_KEY=your_authorization_key
LOOPMESSAGE_SECRET_KEY=your_api_secret_key
LOOPMESSAGE_SENDER_NAME=Jym  # Optional, defaults to "Jym"
```

Set them in your Convex dashboard or using the CLI:

```bash
npx convex env set LOOPMESSAGE_AUTH_KEY "your_key"
npx convex env set LOOPMESSAGE_SECRET_KEY "your_secret"
npx convex env set LOOPMESSAGE_SENDER_NAME "Jym"
```

## LoopMessage Configuration

1. **Webhook URL**: Point LoopMessage to your Convex deployment:

   ```
   https://your-deployment.convex.site/loopmessage/webhook
   ```

2. **Webhook Format**: The integration expects this payload format:
   ```json
   {
     "alert_type": "message_inbound",
     "recipient": "+1234567890",
     "text": "Hello Jym!",
     "message_type": "text",
     "message_id": "59c55Ce8-41d6-43Cc-9116-8cfb2e696D7b",
     "webhook_id": "ab5Ae733-cCFc-4025-9987-7279b26bE71b",
     "api_version": "1.0",
     "delivery_type": "imessage"
   }
   ```

## Features

### Webhook Processing

- Handles multiple LoopMessage alert types: `message_inbound`, `message_sent`, `message_failed`, `message_reaction`, etc.
- Responds with typing indicators and read receipts for better user experience
- Proper error handling and logging for different webhook scenarios

### Thread Management

- Each user gets their own conversation thread
- Context is maintained across messages
- Threads are created automatically on first message

### User Management

- **Simple Phone-based IDs**: Uses phone numbers directly as user IDs for LoopMessage users
- **Instant User Creation**: Creates user profiles immediately without external API calls
- **Platform Separation**: BetterAuth reserved for Next.js web app, simple profiles for webhooks
- **Fast Processing**: No authentication overhead for webhook-originated conversations
- **Focused Data Model**: Stores only essential fitness coaching data for each phone number

### Agent Integration

- Uses jymAgent (GPT-4o-mini) for responses
- Maintains conversation context via threads
- Provides fitness coaching instructions

### Smart Response Features

- 3-second typing indicator shown while generating responses
- Messages automatically marked as read
- Proper message threading and conversation context

## Testing

### Test inbound message webhook:

```javascript
// Test a regular inbound message
await api.test_loopmessage.testWebhook({
  phoneNumber: "+1234567890",
  messageText: "Hi Jym, I want to start working out!",
  alertType: "message_inbound", // Optional, defaults to message_inbound
});
```

### Test different webhook alert types:

```javascript
// Test message sent confirmation
await api.test_loopmessage.testWebhookAlertTypes({
  phoneNumber: "+1234567890",
  alertType: "message_sent",
});

// Test message failed
await api.test_loopmessage.testWebhookAlertTypes({
  phoneNumber: "+1234567890",
  alertType: "message_failed",
});

// Test message reaction
await api.test_loopmessage.testWebhookAlertTypes({
  phoneNumber: "+1234567890",
  alertType: "message_reaction",
});
```

### Test direct message sending:

```javascript
await api.test_loopmessage.testSendMessage({
  phoneNumber: "+1234567890",
  message: "This is a test message from Jym!",
});
```

### Check user conversation:

```javascript
await api.test_loopmessage.getUserMessages({
  phoneNumber: "+1234567890",
});

// Check user profile
await api.test_loopmessage.getUserProfile({
  phoneNumber: "+1234567890",
});
```

## API Endpoints

### HTTP Webhook

- **URL**: `POST /loopmessage/webhook`
- **Purpose**: Receives incoming iMessage messages from LoopMessage
- **Response**: `200 OK` with `{"success": true}`

### Internal Functions

#### `processIncomingMessage`

- Processes webhook payload and validates message data
- Finds existing user profiles by phone number (used as user ID)
- Creates user profiles instantly for new phone numbers
- Schedules response generation immediately for all messages

#### `generateResponse`

- Uses phone number as simple user ID for thread management
- Creates or continues conversation thread per phone number
- Uses jymAgent to generate contextual responses
- Sends response via LoopMessage API

#### `sendMessage`

- Sends messages via LoopMessage API
- Handles API authentication and error handling
- Tracks original message IDs for proper threading

## Error Handling

- Invalid webhooks are logged and ignored
- Failed API calls include fallback error messages
- User creation failures are logged
- Thread management errors are handled gracefully

## Rate Limiting

The integration automatically handles:

- LoopMessage API rate limits
- Convex function scheduling
- Error recovery with fallback messages

## Monitoring

Check logs in your Convex dashboard for:

- Incoming webhook processing
- Agent response generation
- LoopMessage API calls
- Error messages and failures
