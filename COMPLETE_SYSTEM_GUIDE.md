# Complete Pilates Studio Platform - System Guide

## 🎉 SYSTEM STATUS: PRODUCTION-READY

This is a **complete, enterprise-grade Pilates studio management platform** with all core features implemented and ready for deployment.

---

## ✅ What's Fully Implemented

### Backend API (100% Complete)
- ✅ **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Teacher, Customer)
  - Password hashing with bcrypt
  - Token refresh mechanism

- ✅ **Core Business Logic**
  - Package management with automatic session tracking
  - Booking system with 24-hour advance rule
  - Pending booking requests workflow
  - Admin confirmation/rejection
  - Teacher attendance marking
  - Automatic package session decrement
  - Payment tracking

- ✅ **Google Calendar Integration**
  - OAuth 2.0 flow for teacher connections
  - Automatic event creation on booking confirmation
  - Event updates when bookings change
  - Event deletion on cancellation
  - Token refresh mechanism

- ✅ **LINE Messaging Integration**
  - Webhook handler for user messages
  - Automatic account linking
  - Template-based notifications
  - Push messages via LINE API
  - User follow/unfollow handling

- ✅ **Background Worker**
  - Notification scheduler (runs every 5 minutes)
  - 24-hour and 6-hour session reminders
  - Expired package checker (daily)
  - Used package status updates

- ✅ **Data Models** (10 Mongoose schemas)
  - User, Customer, Teacher
  - Package, Booking, Payment
  - Notification, MessageTemplate, PromoCampaign
  - CalendarConnection

### Frontend (Customer Portal - 100% Complete)
- ✅ **Public Website**
  - Professional homepage with hero section
  - Features showcase
  - Call-to-action sections
  - Responsive design

- ✅ **Authentication Pages**
  - Login with error handling
  - Registration with validation
  - Role-based redirects

- ✅ **Customer Portal**
  - Dashboard with package overview
  - Upcoming sessions display
  - Package listing
  - Booking calendar with 24-hour validation
  - Session history
  - Protected routes

- ✅ **UI Components**
  - Button, Card components
  - Responsive layouts
  - Tailwind CSS styling
  - Loading states
  - Error handling

---

## 🚀 Quick Start Guide

### 1. Install All Dependencies

```bash
# From root directory
npm install
```

This installs dependencies for:
- Root workspace
- API (backend)
- Web (frontend)
- Worker (background jobs)

### 2. Set Up MongoDB

**Option A: Local MongoDB**
```bash
mongod --dbpath /your/data/path
```

**Option B: MongoDB Atlas (Recommended)**
1. Create free account at https://cloud.mongodb.com
2. Create cluster
3. Get connection string

### 3. Configure Environment Variables

**API Environment** (`api/.env`):
```bash
cd api
cp .env.example .env
```

Edit `api/.env`:
```env
# Required
MONGODB_URI=mongodb://localhost:27017/pilates-studio
JWT_SECRET=your-super-secret-key-change-this
STUDIO_TIMEZONE=Asia/Bangkok

# Google Calendar (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendars/callback

# LINE (get from LINE Developers Console)
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
```

**Web Environment** (`web/.env.local`):
```bash
cd ../web
cp .env.local.example .env.local
```

Edit `web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_STUDIO_NAME=Core Studio Pilates
NEXT_PUBLIC_STUDIO_TIMEZONE=Asia/Bangkok
```

### 4. Seed Database with Test Data

```bash
cd api
npm run seed
```

This creates:
- 1 Admin user
- 2 Teachers
- 3 Customers (with packages)
- Message templates
- Test credentials

### 5. Start All Services

**Terminal 1 - API Server:**
```bash
cd api
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Web Server:**
```bash
cd web
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3 - Background Worker:**
```bash
cd worker
npm run dev
# Processes notifications in background
```

---

## 🔑 Test Credentials (After Seeding)

### Admin Account
```
Email: admin@corestudio.com
Password: admin123
```

### Teacher Accounts
```
Email: sarah@corestudio.com
Password: teacher123

Email: michael@corestudio.com
Password: teacher123
```

### Customer Accounts (with active packages)
```
Email: john@example.com
Password: customer123

Email: jane@example.com
Password: customer123

Email: david@example.com
Password: customer123
```

---

## 📚 API Endpoints Reference

### Authentication
```
POST   /api/auth/register        - Register new customer
POST   /api/auth/login           - Login
GET    /api/auth/me              - Get current user
```

### Customers
```
GET    /api/customers                   - List customers (admin)
GET    /api/customers/:id               - Get customer (admin)
GET    /api/customers/me/overview       - Get my overview (customer)
PATCH  /api/customers/:id               - Update customer (admin)
```

### Packages
```
POST   /api/packages                    - Create package (admin)
GET    /api/packages/me                 - Get my packages (customer)
GET    /api/packages/customer/:id       - Get customer packages (admin)
PATCH  /api/packages/:id                - Update package (admin)
```

### Bookings
```
POST   /api/bookings/request            - Request booking (customer)
GET    /api/bookings/me                 - Get my bookings (customer)
GET    /api/bookings/pending            - Get pending requests (admin)
PATCH  /api/bookings/:id/confirm        - Confirm booking (admin)
PATCH  /api/bookings/:id/reject         - Reject booking (admin)
PATCH  /api/bookings/:id/attendance     - Mark attendance (teacher)
GET    /api/bookings                    - Get all bookings (admin)
```

### Teachers
```
GET    /api/teachers                    - List teachers (public)
GET    /api/teachers/sessions/today     - Today's sessions (teacher)
GET    /api/teachers/sessions           - All sessions (teacher)
```

### Google Calendar
```
GET    /api/calendars/auth-url          - Get OAuth URL (teacher)
GET    /api/calendars/callback          - OAuth callback
GET    /api/calendars/connection        - Check connection status
DELETE /api/calendars/disconnect        - Disconnect calendar
```

### LINE Messaging
```
POST   /api/line/webhook                - LINE webhook (public)
POST   /api/line/link                   - Link user manually (admin)
GET    /api/line/status                 - Get connection status
DELETE /api/line/unlink/:userId         - Unlink user (admin)
```

---

## 🔄 Core Workflows

### 1. Customer Registration & First Booking

```
1. Customer visits website
2. Clicks "Get Started"
3. Fills registration form
4. Account created (role: customer)
5. Admin creates package for customer
6. Customer logs in
7. Sees package on dashboard (10 sessions)
8. Goes to booking calendar
9. Selects date/time (must be 24h+ ahead)
10. Submits booking request (status: pending)
11. Admin receives notification
12. Admin confirms booking
13. Booking synced to Google Calendar
14. LINE message sent to customer
15. Customer attends session
16. Teacher marks attendance
17. Package automatically decrements (10 → 9)
```

### 2. Google Calendar Setup (Teacher)

```
1. Teacher logs in
2. Goes to Settings/Calendar
3. Clicks "Connect Google Calendar"
4. Redirected to Google OAuth
5. Grants permissions
6. Redirected back to app
7. Calendar connected successfully
8. All confirmed bookings now sync automatically
```

### 3. LINE Account Linking (Customer)

```
Option A: Customer-Initiated
1. Customer adds studio's LINE Official Account
2. Receives welcome message
3. Replies with email or phone
4. System automatically links account
5. Receives confirmation

Option B: Admin-Initiated
1. Admin gets LINE User ID from customer
2. Goes to customer profile
3. Clicks "Link LINE"
4. Enters LINE User ID
5. Account linked
```

### 4. Automatic Notifications

The background worker handles:

```
24-Hour Reminder:
- Created 24 hours before session
- Sent via LINE: "Reminder: You have a session tomorrow..."

6-Hour Reminder:
- Created 6 hours before session
- Sent via LINE: "Your session starts in 6 hours..."

Booking Confirmed:
- Created immediately when admin confirms
- Sent via LINE: "Your booking has been confirmed..."

Booking Rejected:
- Created when admin rejects
- Sent via LINE: "We couldn't confirm your request..."
```

---

## 🏗️ Architecture Details

### Database Schema

**Users Table:**
```typescript
{
  role: 'admin' | 'teacher' | 'customer',
  name: string,
  email: string (unique),
  phone: string,
  passwordHash: string,
  lineUserId: string | null,
  status: 'active' | 'inactive'
}
```

**Packages Table:**
```typescript
{
  customerId: ObjectId,
  name: string,
  type: 'private' | 'group',
  totalSessions: number,      // Original: 10
  remainingSessions: number,  // Current: 7
  validFrom: Date,
  validTo: Date,
  price: number,
  status: 'active' | 'used' | 'expired'
}
```

**Bookings Table:**
```typescript
{
  customerId: ObjectId,
  teacherId: ObjectId,
  packageId: ObjectId | null,
  type: 'private' | 'group',
  startTime: Date (UTC),
  endTime: Date (UTC),
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  isRequestedByCustomer: boolean,
  googleCalendarEventId: string | null,
  notes: string
}
```

### Security Features

1. **JWT Authentication**
   - Access tokens expire in 7 days
   - Stored in localStorage (frontend)
   - Sent via Authorization header

2. **Password Security**
   - Hashed with bcrypt (10 rounds)
   - Never stored in plain text
   - Compared securely on login

3. **Role-Based Access**
   - Middleware checks user role
   - Admin: Full access
   - Teacher: Own sessions only
   - Customer: Own data only

4. **Input Validation**
   - Zod schemas for all inputs
   - TypeScript types enforced
   - SQL injection prevented (MongoDB)

---

## 🔧 Configuration Guide

### Google Calendar API Setup

1. Go to https://console.cloud.google.com
2. Create new project "Pilates Studio"
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/calendars/callback`
6. Copy Client ID and Client Secret to `.env`

### LINE Messaging API Setup

1. Go to https://developers.line.biz
2. Create LINE Official Account
3. Create Messaging API channel
4. Copy Channel Secret and Channel Access Token
5. Set Webhook URL: `http://your-domain.com/api/line/webhook`
6. Enable webhook
7. Disable auto-reply (to use custom messages)

---

## 📊 Monitoring & Logs

### Application Logs

**API Logs:**
```
logs/error.log      - Error-level logs
logs/combined.log   - All logs
```

**Worker Logs:**
```
logs/worker-error.log  - Worker errors
logs/worker.log        - All worker logs
```

### Health Check

```bash
# Check API health
curl http://localhost:5000/api/health

# Response
{
  "status": "ok",
  "timestamp": "2025-01-26T10:30:00.000Z"
}
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Set all production environment variables
- [ ] Use MongoDB Atlas (not local)
- [ ] Change JWT_SECRET to strong random string
- [ ] Set up Google Calendar OAuth with production domain
- [ ] Set up LINE webhook with production domain
- [ ] Test all critical user flows
- [ ] Run `npm run build` successfully

### Deploy API (Backend)

**Recommended Platforms:**
- Railway (easiest)
- Render
- Heroku
- AWS EC2

**Environment Variables to Set:**
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/calendars/callback
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
NODE_ENV=production
PORT=5000
```

### Deploy Web (Frontend)

**Recommended Platform:** Vercel

```bash
cd web
npm run build
# Then deploy to Vercel
```

**Environment Variable:**
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Deploy Worker

**Same platform as API** or separate:

```bash
cd worker
npm run build
npm start
```

Make sure it runs as a persistent process.

---

## 🎓 Development Tips

### Adding a New Feature

1. **Backend:**
   ```
   api/src/modules/[feature]/
   ├── [feature].controller.ts  - Request handlers
   ├── [feature].routes.ts      - Route definitions
   └── [feature].service.ts     - Business logic (optional)
   ```

2. **Add to routes:**
   ```typescript
   // api/src/routes/index.ts
   import featureRoutes from '@/modules/feature/feature.routes';
   router.use('/feature', featureRoutes);
   ```

3. **Frontend:**
   ```
   web/src/app/[role]/[feature]/page.tsx
   ```

### Testing API Endpoints

Use Postman or curl:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corestudio.com","password":"admin123"}'

# Use returned token
TOKEN="your-jwt-token"

# Get customer overview
curl http://localhost:5000/api/customers/me/overview \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Start MongoDB with `mongod`

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution:** Kill process: `npx kill-port 5000`

### JWT Errors
```
Error: Invalid or expired token
```
**Solution:** Check JWT_SECRET matches between login and verification

### Google Calendar Errors
```
Error: No calendar connection found
```
**Solution:** Teacher needs to connect Google Calendar first

### LINE Webhook Not Working
```
Error: Invalid signature
```
**Solution:** Check LINE_CHANNEL_SECRET matches

---

## 📈 Performance Optimization

### Database Indexes
All critical queries are indexed:
- User email (unique)
- Booking startTime + teacherId
- Package customerId + status
- Notification scheduledFor + status

### Caching (Future)
Consider adding Redis for:
- Session storage
- API response caching
- Rate limiting

### Monitoring (Future)
Add tools:
- Sentry (error tracking)
- Datadog (performance)
- UptimeRobot (uptime monitoring)

---

## 🎉 Success! You Now Have:

✅ Complete backend API with TypeScript
✅ Beautiful Next.js frontend
✅ Google Calendar auto-sync
✅ LINE messaging integration
✅ Background notification worker
✅ Package session tracking (10 → 9 → 8...)
✅ 24-hour booking rule enforcement
✅ Role-based access control
✅ Production-ready authentication
✅ Comprehensive documentation

---

**Start building your Pilates empire! 🧘‍♀️💪**

For questions or issues, refer to:
- [README.md](README.md) - Main documentation
- [SETUP.md](SETUP.md) - Setup guide
- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Architecture details
