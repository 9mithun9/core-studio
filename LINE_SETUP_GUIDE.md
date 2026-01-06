# LINE Messaging Integration Setup Guide

This guide will help you set up LINE messaging integration for your Pilates Studio Management System.

## What is LINE Integration?

LINE is a popular messaging app in Thailand and Asia. This integration allows your system to automatically send notifications to users via LINE for:

- ✅ Booking confirmations and rejections
- ✅ Booking cancellations
- ✅ Package request approvals/rejections
- ✅ Registration approvals
- ✅ Session reminders
- ✅ Cancellation requests
- ✅ And all other in-app notifications

## Prerequisites

- A LINE Business Account (free)
- Access to LINE Developers Console

## Step-by-Step Setup

### 1. Create a LINE Developers Account

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Log in with your LINE account (or create one)
3. Accept the terms of service

### 2. Create a Provider

1. Click **"Create a new provider"**
2. Enter your provider name: `Core Studio Pilates` (or your studio name)
3. Click **"Create"**

### 3. Create a Messaging API Channel

1. Click on your provider
2. Click **"Create a new channel"**
3. Select **"Messaging API"**
4. Fill in the channel information:
   - **Channel name**: `Core Studio Notifications`
   - **Channel description**: `Automated notifications for studio customers`
   - **Category**: `Education` or `Health & Fitness`
   - **Subcategory**: Choose appropriate option
   - **Email address**: Your studio email
5. Review and agree to terms
6. Click **"Create"**

### 4. Get Your Credentials

#### Channel Secret:

1. Go to the **"Basic settings"** tab
2. Find **"Channel secret"**
3. Copy the secret value

#### Channel Access Token:

1. Go to the **"Messaging API"** tab
2. Scroll down to **"Channel access token"**
3. Click **"Issue"** button
4. Copy the generated token (long string starting with something like `eyJ...`)

### 5. Configure Railway Environment Variables

1. Go to your Railway project dashboard
2. Click on your **pilates-studio-api** service
3. Go to **"Variables"** tab
4. Add these two variables:

```
LINE_CHANNEL_ACCESS_TOKEN=<paste your channel access token here>
LINE_CHANNEL_SECRET=<paste your channel secret here>
```

5. Click **"Deploy"** to restart with new variables

### 6. Optional: Configure LINE Bot Settings

In the LINE Developers Console → Messaging API tab:

1. **Enable** these features:
   - ✅ Allow bot to join group chats (optional)
   - ✅ Use webhooks

2. **Disable** these features (to prevent unwanted behavior):
   - ❌ Auto-reply messages
   - ❌ Greeting messages

3. Set **Webhook URL** (optional, for future two-way communication):
   ```
   https://your-railway-domain.up.railway.app/api/webhook/line
   ```

### 7. How Users Connect Their LINE Account

Users need to connect their LINE account to receive notifications:

#### Option 1: QR Code (Recommended)

1. In the LINE Developers Console → Messaging API tab
2. Find the **"QR code"** section
3. Display this QR code on your website or in-studio
4. Users scan with LINE app and click "Add friend"

#### Option 2: LINE ID

1. In the LINE Developers Console → Messaging API tab
2. Find the **"LINE ID"** (e.g., @abc1234)
3. Share this ID with users
4. Users search for this ID in LINE and add as friend

#### Option 3: Direct Link

Create a LINE Add Friend link:
```
https://line.me/R/ti/p/<Your_Bot_ID>
```

Replace `<Your_Bot_ID>` with your bot's Basic ID (found in Messaging API tab).

### 8. Link LINE User ID to User Account

**Important**: After users add your LINE bot as a friend, you need to link their LINE User ID to their account in your system.

Currently, this needs to be done manually by an admin:

1. Ask the user to send a message to your LINE bot
2. Check LINE Developers Console → "Chat" to see incoming messages
3. Get the user's LINE User ID from the message
4. In your database, update the user's record to add their `lineUserId`

**Future Enhancement**: You can implement an automated linking flow where users click a link that includes their user ID, and the system automatically associates their LINE account.

## Testing the Integration

### 1. Verify Railway Deployment

Check Railway logs to confirm:
```
✅ Server started successfully
✅ No LINE-related errors
```

If LINE credentials are missing, you'll see:
```
⚠️ LINE credentials not configured. LINE messaging features will be disabled.
```

### 2. Test Notification Flow

1. Have a test user with `lineUserId` set in database
2. Create a booking or trigger any notification
3. User should receive:
   - In-app notification (notification bell)
   - LINE message with same content

### 3. Test Message Format

LINE messages are formatted as:
```
📢 [Notification Title]

[Notification Message]
```

Example:
```
📢 Booking Request Approved

Your booking request for 1/15/2026 has been approved by Teacher Name
```

## Troubleshooting

### LINE messages not being sent

**Check 1**: Verify credentials are set in Railway
```bash
# In Railway dashboard → Variables, confirm both exist:
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET
```

**Check 2**: Verify user has lineUserId
```javascript
// In MongoDB or your database, check user document:
{
  _id: "...",
  email: "user@example.com",
  lineUserId: "U1234567890abcdef..." // <-- Must exist
}
```

**Check 3**: Check Railway logs for errors
```
Look for:
- "LINE client not available" → Credentials missing
- "User doesn't have LINE connected" → lineUserId not set
- Any other LINE-related errors
```

### User says they didn't receive LINE message

1. Confirm they added your LINE bot as friend
2. Confirm their `lineUserId` is saved in database
3. Check if they blocked the bot in LINE
4. Check Railway logs for delivery errors

### Getting LINE User ID

To manually get a user's LINE User ID:

1. User sends any message to your bot
2. LINE Developers Console → Your Channel → Messaging API → Webhook
3. Enable webhook and set URL
4. When user messages bot, you'll receive webhook with their `userId`

## Security Best Practices

1. **Never commit credentials to git** - Always use environment variables
2. **Rotate tokens periodically** - Generate new access token every 6-12 months
3. **Monitor usage** - LINE has free tier limits, monitor in Developers Console
4. **HTTPS only** - Webhook URLs must use HTTPS (Railway provides this)

## Costs

LINE Messaging API pricing (as of 2024):

- **Free tier**: 1,000 messages per month
- **Paid tier**: Starts at ~$0.01-0.02 per message for higher volumes

For a typical pilates studio with 100 active users:
- Estimated: 500-1,000 messages/month (stays in free tier)
- If you exceed free tier, costs are minimal

## Next Steps After Setup

1. ✅ Add QR code to your website for easy LINE connection
2. ✅ Create onboarding flow to link LINE accounts
3. ✅ Implement webhook to auto-capture LINE User IDs
4. ✅ Add "Connect LINE" button in user profile page
5. ✅ Send welcome message when users first connect

## Support Resources

- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Bot SDK for Node.js](https://github.com/line/line-bot-sdk-nodejs)
- [LINE Developers Community](https://www.line-community.me/)

## Summary

Once set up, every notification that appears in the user's notification bell will **automatically** be sent to their LINE account as well. This provides:

- ✅ Better customer engagement
- ✅ Higher notification open rates
- ✅ Reduced no-shows with LINE reminders
- ✅ Seamless multi-channel communication

No code changes needed - the integration is already built into your notification system!
