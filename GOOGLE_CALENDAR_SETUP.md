# Google Calendar Integration Setup Guide

## Overview
This guide will help you set up Google Calendar integration so that your Google Calendar events automatically block time slots for customer bookings.

## Features
✅ **Two-way sync**: Confirmed bookings are added to your Google Calendar
✅ **Automatic blocking**: Your Google Calendar events block booking slots
✅ **Prevent double bookings**: Customers can't book when you're busy
✅ **Real-time updates**: Calendar data is fetched in real-time when customers check availability

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **NEW PROJECT**
3. Enter project name: `Core Studio Pilates`
4. Click **CREATE**

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on **Google Calendar API**
4. Click **ENABLE**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: `Core Studio Pilates`
   - User support email: Your email
   - Developer contact email: Your email
   - Scopes: Add `../auth/calendar.events` scope
   - Test users: Add your teacher accounts' Gmail addresses
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Core Studio Calendar Integration`
   - Authorized redirect URIs:
     - `http://localhost:5000/api/calendars/callback` (for development)
     - `https://yourdomain.com/api/calendars/callback` (for production)
5. Click **CREATE**
6. **Save the Client ID and Client Secret** - you'll need these!

## Step 4: Get Refresh Token

To automatically create calendar events, you need a refresh token:

### Option A: Use OAuth 2.0 Playground
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) and check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select `https://www.googleapis.com/auth/calendar` scope
5. Click "Authorize APIs" and sign in
6. Click "Exchange authorization code for tokens"
7. Copy the **Refresh token**

## Step 5: Configure Environment Variables

Update your `api/.env` file with the credentials:

```env
# Google Calendar API
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendars/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
GOOGLE_CALENDAR_ID=primary
```

**Important**:
- Replace the placeholder values with your actual credentials
- Set `GOOGLE_CALENDAR_ENABLED=true` to enable automatic event creation
- Use `primary` as Calendar ID for your main calendar, or specify a specific calendar ID

## Step 5: Restart API Server

After updating the `.env` file, restart your API server:

```bash
cd api
npm run dev
```

## Step 6: Connect Teacher's Google Calendar

1. Log in as a teacher (e.g., `sarah@corestudio.com` / `teacher123`)
2. Go to **Calendar Sync** in the navigation
3. Click **Connect Google Calendar**
4. Sign in with your Google account (the one with the Pilates studio calendar)
5. Grant permissions to access calendar
6. You'll be redirected back - connection successful! ✓

## How It Works

### Automatic Event Creation:
When a teacher confirms a booking, the system automatically:
1. ✅ Creates a Google Calendar event with:
   - Title: "[Session Type] Session - [Customer Name]"
   - Description: Teacher name, session type, package details, notes
   - Location: Studio location
   - Attendees: Customer and teacher emails
   - Reminders: 24 hours before and 1 hour before
2. ✅ Stores the event ID in the booking record
3. ✅ Sends email notifications to attendees (if enabled in Google Calendar)

### For Teachers:
1. Connect your Google Calendar via the **Calendar Sync** page (optional for two-way sync)
2. When you confirm a booking, it's automatically added to your Google Calendar
3. Any personal events in your Google Calendar can block booking slots (if calendar sync is connected)

### For Customers:
1. When booking a session, they select a teacher
2. After teacher confirmation, they receive the calendar invite
3. They can add it to their own calendar from the email
4. Automatic reminders before the session

## Example Scenario

**Teacher's Google Calendar:**
- Monday 10:00 AM - 11:00 AM: "Personal Appointment"
- Monday 2:00 PM - 3:00 PM: "Doctor Visit"

**System Bookings:**
- Monday 11:00 AM - 12:00 PM: Confirmed session with John

**What customers see when booking for Monday:**
- 9:00 AM ✓ Available
- 10:00 AM 🔒 Blocked (Google Calendar)
- 11:00 AM 🔒 Blocked (Confirmed booking)
- 12:00 PM ✓ Available
- 1:00 PM ✓ Available
- 2:00 PM 🔒 Blocked (Google Calendar)
- 3:00 PM ✓ Available

## Testing

1. **Add a test event** to your Google Calendar (e.g., "Test Block" at tomorrow 2:00 PM)
2. **Log in as a customer** (e.g., `john@example.com` / `customer123`)
3. **Try to book** a session at that time
4. **Verify** the time slot shows as 🔒 blocked

## Troubleshooting

### "Failed to connect to Google Calendar"
- Check that the Client ID and Client Secret are correct in `.env`
- Verify the redirect URI matches exactly (including http/https)
- Make sure the API server is running

### "No calendar connection found"
- Teacher needs to connect their calendar via the Calendar Sync page first
- Check database for CalendarConnection record

### Time slots not blocking
- Verify the teacher has connected their Google Calendar
- Check API logs for errors when fetching busy times
- Test with a fresh event in Google Calendar

### Token expired errors
- The system automatically refreshes expired tokens
- If issues persist, disconnect and reconnect the calendar

## Security Notes

- ✅ Only calendar availability (busy/free) is accessed
- ✅ Event details from Google Calendar are NOT stored in the database
- ✅ Tokens are encrypted and stored securely
- ✅ OAuth 2.0 with automatic token refresh
- ✅ Teachers can disconnect anytime

## Production Deployment

When deploying to production:

1. Update `GOOGLE_REDIRECT_URI` in `.env` to your production URL
2. Add production redirect URI to Google Cloud Console
3. Move OAuth consent screen from "Testing" to "Published"
4. Consider adding more scopes if needed

## API Endpoints

### Teacher endpoints:
- `GET /api/calendars/auth-url` - Get OAuth URL to connect
- `GET /api/calendars/connection` - Check connection status
- `DELETE /api/calendars/disconnect` - Disconnect calendar

### Customer endpoints:
- `GET /api/bookings/availability` - Get available slots (includes Google Calendar blocks)

## Support

For issues or questions, check the API logs:
```bash
cd api
npm run dev
```

Look for logs with `[GoogleCalendarService]` prefix.
