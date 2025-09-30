# SMS Deployment Checklist

Use this checklist to deploy your SMS integration step-by-step.

## 📋 Pre-Deployment

### Twilio Account Setup

- [ ] Twilio account created
- [ ] Canadian phone number purchased and active
- [ ] Account has sufficient credit/balance
- [ ] Account SID copied from dashboard
- [ ] Auth Token copied from dashboard
- [ ] Phone number noted (with + prefix)

### Local Environment

- [ ] Code pulled from repository
- [ ] Dependencies installed: `bun install` (at workspace root)
- [ ] Convex CLI available: `npx convex --version`

## 🚀 Deployment Steps

### Step 1: Environment Variables

```bash
# Navigate to backend package
cd packages/backend

# Set Twilio credentials
npx convex env set TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npx convex env set TWILIO_AUTH_TOKEN "your_auth_token_here"
npx convex env set TWILIO_PHONE_NUMBER "+1xxxxxxxxxx"

# Verify they're set
npx convex env list
```

**Checklist:**

- [ ] TWILIO_ACCOUNT_SID set correctly
- [ ] TWILIO_AUTH_TOKEN set correctly
- [ ] TWILIO_PHONE_NUMBER set correctly (includes + prefix)
- [ ] All three variables visible in `env list`

### Step 2: Deploy to Convex

```bash
# From packages/backend directory
npx convex dev
```

**Checklist:**

- [ ] Deployment successful (no errors)
- [ ] Deployment URL noted (e.g., `https://happy-bear-123.convex.site`)
- [ ] Functions deployed successfully
- [ ] Can see logs with `npx convex logs`

### Step 3: Configure Twilio Webhook

1. **Login to Twilio Console:**
   - [ ] Go to https://console.twilio.com/
   - [ ] Login with your credentials

2. **Navigate to Phone Number:**
   - [ ] Click "Phone Numbers" in left sidebar
   - [ ] Click "Manage"
   - [ ] Click "Active Numbers"
   - [ ] Click on your Canadian phone number

3. **Configure Messaging:**
   - [ ] Scroll to "Messaging Configuration" section
   - [ ] Under "A MESSAGE COMES IN":
     - [ ] Select "Webhook"
     - [ ] Enter: `https://your-deployment.convex.site/sms/webhook`
     - [ ] Select HTTP Method: "POST"
   - [ ] (Optional) Under "STATUS CALLBACK URL":
     - [ ] Enter: `https://your-deployment.convex.site/sms/status`
     - [ ] Select HTTP Method: "POST"
   - [ ] Click "Save" at bottom

4. **Verify Configuration:**
   - [ ] Webhook URL saved successfully
   - [ ] HTTP method is POST
   - [ ] No error messages in Twilio Console

### Step 4: Test the Integration

#### Test 1: Send SMS from your phone

```
Action: Send "Hello Jym!" to your Twilio number
```

**Expected:**

- [ ] Message sent successfully
- [ ] Convex logs show "Twilio SMS webhook received"
- [ ] Response received (login prompt or agent response)

#### Test 2: Check Convex Logs

```bash
npx convex logs --tail
```

**Look for:**

- [ ] "Twilio SMS webhook received"
- [ ] "Processing Twilio SMS webhook"
- [ ] User authentication check logs
- [ ] "SMS sent successfully"

#### Test 3: Unauthenticated User Flow

```
Action: Send SMS from phone not registered in app
```

**Expected:**

- [ ] Receive: "hello human! 👋 before we start please login: https://jym.coach/login"

#### Test 4: Authenticated User Flow

```
Prerequisites: Login on web app, verify phone
Action: Send "I want to workout" from authenticated phone
```

**Expected:**

- [ ] Onboarding starts (if not completed)
- [ ] OR coaching conversation begins (if onboarded)
- [ ] Multiple messages received with natural delays

## 🔍 Verification

### Twilio Console Checks

- [ ] Go to Monitor → Logs → Messaging
- [ ] See incoming message logged
- [ ] See outgoing message(s) logged
- [ ] Status is "delivered" for outgoing messages
- [ ] No error codes

### Convex Console Checks

- [ ] Login to Convex dashboard
- [ ] Check deployment is active
- [ ] Review function logs (no errors)
- [ ] Check database for user profiles
- [ ] Check threads are being created

### End-to-End Flow

- [ ] User can send message
- [ ] User receives response
- [ ] Conversation maintains context
- [ ] Multiple messages sent with delays
- [ ] Message splitting works
- [ ] Multiline formatting preserved

## 🐛 Troubleshooting

### Issue: No webhook received

**Check:**

- [ ] Webhook URL is correct in Twilio Console
- [ ] Deployment is active (check Convex dashboard)
- [ ] Phone number is active in Twilio
- [ ] No typos in webhook URL

**Test:**

```bash
# Check if webhook endpoint is accessible
curl https://your-deployment.convex.site/sms/webhook
```

### Issue: Webhook received but no response sent

**Check:**

- [ ] Environment variables are set correctly
- [ ] Twilio credentials are valid
- [ ] Account has sufficient balance
- [ ] Check Convex logs for errors

**Debug:**

```bash
# Check environment variables
npx convex env list

# Watch logs in real-time
npx convex logs --tail

# Check for errors
npx convex logs | grep -i error
```

### Issue: User not found

**Check:**

- [ ] User has signed up on web app
- [ ] Phone number is verified
- [ ] Phone number format matches (+ prefix)
- [ ] Check betterAuth user table

**Verify:**

```bash
# Check user in database
npx convex dashboard
# Navigate to betterAuth tables
```

### Issue: Messages not splitting

**Check:**

- [ ] Response includes newlines or multiline tags
- [ ] Check logs for "Sending X split messages"
- [ ] Verify sendSplitMessages is being called

## 📊 Monitoring

### Daily Checks

- [ ] Review Twilio usage/costs
- [ ] Check Convex logs for errors
- [ ] Monitor message delivery rates
- [ ] Check user feedback

### Weekly Checks

- [ ] Review Twilio billing
- [ ] Analyze conversation quality
- [ ] Check for failed messages
- [ ] Update documentation as needed

### Monthly Checks

- [ ] Review total SMS costs
- [ ] Analyze user engagement metrics
- [ ] Check for pattern of issues
- [ ] Plan improvements

## 📈 Success Metrics

### Technical Metrics

- [ ] Webhook success rate > 99%
- [ ] Message delivery rate > 95%
- [ ] Average response time < 3 seconds
- [ ] Zero unhandled errors

### User Experience Metrics

- [ ] Users complete onboarding
- [ ] Users engage in conversations
- [ ] Users create workouts
- [ ] Positive user feedback

## 🎉 Post-Deployment

### Immediate (First 24 hours)

- [ ] Monitor logs continuously
- [ ] Test with multiple users
- [ ] Fix any critical issues
- [ ] Document any quirks

### Short-term (First week)

- [ ] Gather user feedback
- [ ] Monitor costs
- [ ] Optimize message splitting
- [ ] Fine-tune response delays

### Long-term (First month)

- [ ] Analyze usage patterns
- [ ] Optimize costs
- [ ] Plan feature enhancements
- [ ] Scale infrastructure if needed

## 🔐 Security Checklist

- [ ] Environment variables not committed to git
- [ ] Webhook endpoint is HTTPS
- [ ] Twilio credentials are secure
- [ ] Rate limiting considered (if high volume)
- [ ] User data is properly protected
- [ ] Compliance requirements met

## 📚 Documentation Review

- [ ] Read SMS_SETUP.md
- [ ] Read SMS_QUICKSTART.md
- [ ] Read MESSAGING_PLATFORMS.md
- [ ] Read SMS_IMPLEMENTATION_SUMMARY.md
- [ ] Bookmark Twilio docs: https://www.twilio.com/docs/sms
- [ ] Bookmark Convex docs: https://docs.convex.dev

## ✅ Deployment Complete

Once all items are checked:

- [ ] SMS integration is live
- [ ] Users can text Jym
- [ ] Monitoring is in place
- [ ] Documentation is accessible
- [ ] Team is trained (if applicable)

## 🎊 Congratulations!

Your SMS integration is deployed and ready for users!

**Next Steps:**

1. Share the number with test users
2. Gather feedback
3. Iterate and improve
4. Consider adding WhatsApp/LoopMessage for multi-platform support

---

**Need Help?**

- Logs: `npx convex logs --tail`
- Twilio Logs: https://console.twilio.com/us1/monitor/logs/sms
- Docs: `SMS_SETUP.md`, `SMS_QUICKSTART.md`
- Code: `packages/backend/convex/sms.ts`
