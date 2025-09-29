# WhatsApp vs LoopMessage Comparison

This document compares the WhatsApp and LoopMessage implementations to help you understand the differences.

## Quick Reference

| Feature                  | LoopMessage                                           | WhatsApp                                                      |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------- |
| **Platform**             | iMessage/SMS                                          | WhatsApp                                                      |
| **Webhook Verification** | No verification endpoint needed                       | Requires GET endpoint with token verification                 |
| **Message Format**       | Flat structure with `alert_type`, `recipient`, `text` | Nested structure with `entry`, `changes`, `value`, `messages` |
| **Phone Number Field**   | `recipient`                                           | `from`                                                        |
| **Message Content**      | `text`                                                | `text.body`                                                   |
| **Typing Indicators**    | Supported via response JSON                           | Not supported in Cloud API                                    |
| **Read Receipts**        | Supported via response JSON                           | Not supported in outbound                                     |
| **Sender Name**          | `sender_name` parameter                               | Configured in Business Profile                                |
| **API Endpoint**         | LoopMessage custom API                                | Meta Graph API                                                |
| **Authentication**       | Custom auth key + secret                              | Bearer token                                                  |
| **Media Support**        | Via API                                               | Via API (not implemented in basic version)                    |
| **Rate Limits**          | Depends on plan                                       | Tiered based on quality rating                                |

## Implementation Differences

### 1. File Structure

**LoopMessage** (`loopmessage.ts`):

- `processIncomingMessage` - Handles incoming messages
- `generateResponse` - AI response generation
- `sendMessage` - Single message sending
- `sendSplitMessages` - Multiple messages with delays
- `parseResponseIntoMessages` - Message splitting logic
- `handleWebhookAlertType` - Status updates
- `getUserConversation` - Debug utility

**WhatsApp** (`whatsapp.ts`):

- Same function names and structure for consistency
- Added webhook verification (handled in `http.ts`)
- `handleStatusUpdate` instead of `handleWebhookAlertType`
- Identical message parsing and splitting logic

### 2. Webhook Payload Structure

#### LoopMessage Incoming Message

```json
{
  "alert_type": "message_inbound",
  "webhook_id": "123",
  "message_id": "abc",
  "recipient": "+1234567890",
  "text": "Hello",
  "message_type": "text"
}
```

#### WhatsApp Incoming Message

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "+1234567890",
                "id": "abc",
                "type": "text",
                "text": { "body": "Hello" }
              }
            ],
            "contacts": [
              {
                "profile": { "name": "John Doe" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### 3. HTTP Routes

#### LoopMessage Routes

```typescript
POST / loopmessage / webhook;
```

#### WhatsApp Routes

```typescript
GET / whatsapp / webhook; // Verification
POST / whatsapp / webhook; // Messages and status updates
```

### 4. Environment Variables

#### LoopMessage

```bash
LOOPMESSAGE_AUTH_KEY
LOOPMESSAGE_SECRET_KEY
LOOPMESSAGE_SENDER_NAME
```

#### WhatsApp

```bash
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN
WHATSAPP_API_VERSION (optional)
```

### 5. Sending Messages

#### LoopMessage API Call

```typescript
fetch("https://server.loopmessage.com/api/v1/message/send/", {
  method: "POST",
  headers: {
    Authorization: authKey,
    "Loop-Secret-Key": secretKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    recipient: phoneNumber,
    text: message,
    sender_name: senderName,
  }),
});
```

#### WhatsApp API Call

```typescript
fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber,
    type: "text",
    text: {
      preview_url: true,
      body: message,
    },
  }),
});
```

### 6. Response Handling

#### LoopMessage

```typescript
// Can return typing indicator and read status
return {
  shouldRespond: true,
  typing: 3, // Show typing for 3 seconds
  read: true, // Mark message as read
};
```

#### WhatsApp

```typescript
// No typing indicator support in Cloud API
return {
  shouldRespond: true,
};
```

### 7. User Profile Platform Field

- **LoopMessage**: `platform: "loopmessage"`
- **WhatsApp**: `platform: "whatsapp"`

## Migration Path

If you want to support both platforms simultaneously:

1. **Keep both files** (`loopmessage.ts` and `whatsapp.ts`)
2. **Both routes** stay in `http.ts`
3. **Platform detection** in user profile determines which service to use
4. **Shared agent logic** - both use the same agents
5. **Shared message parsing** - both use the same multiline tag logic

## Common Features

Both implementations share:

- ✅ User authentication check via betterAuth
- ✅ User profile creation/lookup
- ✅ Onboarding vs. main agent selection
- ✅ Thread management
- ✅ Message splitting with realistic delays
- ✅ Multiline tag support
- ✅ Error handling and fallback messages
- ✅ Conversation history retrieval
- ✅ Phone number validation

## Performance Considerations

| Aspect               | LoopMessage            | WhatsApp                                               |
| -------------------- | ---------------------- | ------------------------------------------------------ |
| **Webhook Latency**  | Low                    | Low                                                    |
| **Message Delivery** | Fast (native iMessage) | Fast (WhatsApp)                                        |
| **Rate Limits**      | Platform-specific      | Tiered (1K-unlimited/day)                              |
| **Cost**             | Per-message pricing    | Free for user-initiated, tiered for business-initiated |

## Testing

### LoopMessage Testing

1. Configure webhook in LoopMessage dashboard
2. Send iMessage to your configured number
3. Monitor Convex logs

### WhatsApp Testing

1. Configure webhook in Meta Developer Console
2. Use Meta's test number or your production number
3. Send WhatsApp message to business number
4. Monitor Convex logs

## Troubleshooting Comparison

### Common Issues

| Issue                    | LoopMessage                 | WhatsApp                         |
| ------------------------ | --------------------------- | -------------------------------- |
| **Webhook not received** | Check LoopMessage dashboard | Check Meta webhook subscriptions |
| **Auth failure**         | Verify auth key + secret    | Verify access token              |
| **Send failure**         | Check sender name config    | Check phone number ID            |
| **Phone format**         | E.164 format                | E.164 format                     |
| **User not found**       | Check betterAuth            | Check betterAuth                 |

## Future Enhancements

Both platforms could benefit from:

- Media message support (images, videos, documents)
- Reaction handling
- Reply to specific message
- Improved error handling
- Message queueing for rate limit management
- Analytics and metrics

WhatsApp-specific potential features:

- Template messages for business-initiated conversations
- Interactive messages (buttons, lists)
- WhatsApp Business catalog integration
- Location sharing
- Contact sharing
