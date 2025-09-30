# Messaging Platforms Comparison

Jym supports three messaging platforms for user interaction. Here's a comparison to help you choose the right one for your needs.

## Platform Overview

| Feature               | SMS (Twilio) | WhatsApp     | LoopMessage (iMessage) |
| --------------------- | ------------ | ------------ | ---------------------- |
| **Reach**             | Global       | Global       | iOS/macOS only         |
| **Cost per message**  | ~$0.0075     | ~$0.005-0.01 | Variable               |
| **Setup complexity**  | Low          | High         | Medium                 |
| **Rich media**        | Basic MMS    | Full support | Full support           |
| **Delivery status**   | Available    | Available    | Available              |
| **Read receipts**     | No           | Yes          | Yes                    |
| **Typing indicators** | No           | No           | Yes                    |
| **Group messaging**   | Limited      | Yes          | Yes                    |

## Platform Details

### SMS (Twilio) - `sms.ts`

**Best for:** Wide reach, simple implementation, reliable delivery

#### Pros:

- ✅ Works on any phone (smartphone or basic phone)
- ✅ No app installation required
- ✅ Simple setup and maintenance
- ✅ Reliable delivery
- ✅ Good for Canadian market
- ✅ Direct billing through Twilio

#### Cons:

- ❌ No rich media support (basic MMS only)
- ❌ No read receipts or typing indicators
- ❌ Character limits (160 per SMS)
- ❌ Higher cost for international messages
- ❌ No end-to-end encryption

#### Use Cases:

- Users who prefer traditional SMS
- Maximum accessibility (works on any phone)
- North American users
- Simple text-based coaching

#### Implementation:

- File: `packages/backend/convex/sms.ts`
- Webhook: `/sms/webhook`
- Setup guide: `SMS_SETUP.md`

---

### WhatsApp (Meta Business API) - `whatsapp.ts`

**Best for:** International users, rich media, modern messaging experience

#### Pros:

- ✅ Very popular internationally
- ✅ Lower cost than SMS
- ✅ Rich media support (images, videos, documents)
- ✅ Read receipts and typing indicators
- ✅ End-to-end encryption
- ✅ Better user experience on mobile

#### Cons:

- ❌ Requires Meta Business approval
- ❌ Complex setup and compliance
- ❌ 24-hour messaging window restrictions
- ❌ Template message requirements for marketing
- ❌ Requires WhatsApp app

#### Use Cases:

- International user base
- Rich media sharing (workout videos, images)
- Better engagement metrics
- Modern messaging experience

#### Implementation:

- File: `packages/backend/convex/whatsapp.ts`
- Webhook: `/whatsapp/webhook`
- Setup guide: `WHATSAPP_SETUP.md`

---

### LoopMessage (iMessage) - `loopmessage.ts`

**Best for:** iOS/macOS users, native Apple ecosystem experience

#### Pros:

- ✅ Native iMessage experience
- ✅ Rich media support
- ✅ Read receipts and typing indicators
- ✅ No phone number required (can use email)
- ✅ Seamless for Apple users
- ✅ Supports reactions and effects

#### Cons:

- ❌ iOS/macOS only
- ❌ Requires LoopMessage service
- ❌ Not as widely accessible
- ❌ Cost varies by usage
- ❌ Requires Mac computer running LoopMessage

#### Use Cases:

- Apple-focused user base
- US market (where iMessage is popular)
- Rich native experience
- Users who prefer iMessage

#### Implementation:

- File: `packages/backend/convex/loopmessage.ts`
- Webhook: `/loopmessage/webhook`
- Setup guide: In the file comments

---

## Choosing the Right Platform

### For Canadian Market (Your Use Case):

**Recommended: SMS (Twilio)** ✅

Reasons:

1. Your Canadian Twilio number is already set up
2. SMS has excellent reach in Canada
3. Simple, reliable, and easy to maintain
4. Lower setup complexity
5. Works on all phones (not just smartphones)

### Multi-Platform Strategy:

You can support multiple platforms simultaneously! The architecture is designed for this:

```
User Profile → platform: "sms" | "whatsapp" | "loopmessage"
```

Each user's platform is tracked in their profile, allowing you to:

- Start with SMS for MVP
- Add WhatsApp for international expansion
- Add LoopMessage for iOS-focused features

## Implementation Similarities

All three implementations follow the same pattern:

1. **processIncomingMessage** (mutation)
   - Validates webhook data
   - Authenticates user
   - Creates/finds user profile
   - Schedules response generation

2. **generateResponse** (action)
   - Gets or creates conversation thread
   - Determines appropriate agent (onboarding vs. main)
   - Generates AI response
   - Triggers message sending

3. **sendMessage** (action)
   - Sends single message via platform API

4. **sendSplitMessages** (action)
   - Splits long responses
   - Handles multiline tags
   - Adds realistic delays

5. **getUserConversation** (action)
   - Debugging and history retrieval

## Migration Path

If you want to migrate from LoopMessage/WhatsApp to SMS:

1. **User data is preserved** - All conversations are stored in Convex
2. **Platform field** - User profiles track which platform they're using
3. **No code changes needed** - Just configure the SMS webhook
4. **Gradual transition** - Users can switch platforms naturally

## Cost Comparison (Example Usage)

Assuming 1000 messages/month (500 inbound, 500 outbound):

| Platform     | Monthly Cost | Setup Cost | Ongoing Maintenance |
| ------------ | ------------ | ---------- | ------------------- |
| SMS (Twilio) | ~$7.50       | Low        | Low                 |
| WhatsApp     | ~$5-10       | Medium     | Medium              |
| LoopMessage  | Variable     | Medium     | Low                 |

_Costs are approximate and vary by region and usage_

## Recommended Approach

### Phase 1: Launch with SMS ✅ (Current)

- Quick to set up
- Reliable and simple
- Good for Canadian market
- Low maintenance

### Phase 2: Add WhatsApp (Optional)

- If you expand internationally
- If users request it
- If you need rich media features

### Phase 3: Add LoopMessage (Optional)

- If you have many iOS users
- If you want the native iMessage experience
- If your market heavily uses iMessage

## Current Setup Status

Based on your codebase:

- ✅ **SMS (Twilio)**: Ready to deploy (just set up in this session)
- ✅ **WhatsApp**: Already implemented and configured
- ✅ **LoopMessage**: Already implemented and configured

All three platforms are functional and can be used simultaneously!

## Testing

To test each platform:

### SMS:

```bash
# Send SMS to your Twilio number
# Monitor logs
npx convex logs --tail
```

### WhatsApp:

```bash
# Send WhatsApp message to your business number
# Monitor logs
npx convex logs --tail
```

### LoopMessage:

```bash
# Send iMessage to your configured Apple ID
# Monitor logs
npx convex logs --tail
```

## Support and Debugging

All platforms log to Convex:

```bash
npx convex logs --tail
```

Look for these log patterns:

- SMS: "Twilio SMS webhook received"
- WhatsApp: "WhatsApp webhook received"
- LoopMessage: "LoopMessage webhook received"

Each includes detailed debugging information for troubleshooting.
