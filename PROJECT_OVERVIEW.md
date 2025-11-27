# Core Studio Pilates - Project Overview

## 🎯 Executive Summary

**Core Studio Pilates** is a full-stack web platform that combines:
1. **Public-facing website** - Marketing pages for the Pilates studio
2. **Management system** - Complete booking, package tracking, and payment system
3. **Multi-role portals** - Separate dashboards for customers, teachers, and admins
4. **Automated integrations** - Google Calendar sync and LINE messaging

This system is designed as a **natural upgrade** from the studio's current workflow (Apple Calendar + LINE chat) while maintaining simplicity and familiarity.

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend (API)**
```
Node.js + Express + TypeScript
├── MongoDB (Mongoose ODM)
├── JWT Authentication
├── Google Calendar API
├── LINE Messaging API
└── Background Workers (cron jobs)
```

**Frontend (Web)**
```
Next.js 15 (App Router) + React 18 + TypeScript
├── Tailwind CSS
├── Axios (API client)
└── date-fns (timezone handling)
```

**Infrastructure**
```
Monorepo (npm workspaces)
├── /api - Backend server
├── /web - Frontend app
└── /worker - Background jobs (future)
```

---

## 📊 Data Models

### Core Entities

**1. User** (Authentication & Identity)
- Stores login credentials and role
- Roles: `admin`, `teacher`, `customer`
- Links to role-specific profiles (Customer, Teacher)

**2. Customer** (Client Profile)
- Extended profile for customer users
- Health notes, emergency contacts
- Preferred teacher
- Tags for segmentation

**3. Teacher** (Instructor Profile)
- Extended profile for teacher users
- Bio, specialties, hourly rate
- Active/inactive status
- Calendar integration settings

**4. Package** (Session Bundle)
- Customer's purchased session package
- **Key fields**:
  - `totalSessions`: Original package size (e.g., 10)
  - `remainingSessions`: Current count (10 → 9 → 8...)
  - `validFrom` / `validTo`: Validity period
  - `status`: active, used, expired, frozen
  - `type`: private or group

**5. Booking** (Scheduled Session)
- Represents one scheduled Pilates session
- **Key fields**:
  - `status`: pending → confirmed → completed
  - `isRequestedByCustomer`: true if customer initiated
  - `startTime` / `endTime`: Session timing (UTC)
  - `googleCalendarEventId`: For sync
- **Workflow**: Request → Confirm → Complete → Decrement package

**6. Payment** (Financial Record)
- Links to packages
- Tracks payment method, amount, reference

**7. Notification** (Messaging Queue)
- Scheduled/sent notifications
- Types: confirmations, reminders, promos
- Status: scheduled → sent/failed

**8. MessageTemplate** (Reusable Messages)
- LINE message templates with variables
- Example: "Hi {{name}}, your session on {{date}}..."

**9. CalendarConnection** (Google Integration)
- OAuth tokens for teacher calendars
- Auto-refresh mechanism

---

## 🔄 Core Workflows

### 1. Customer Registration & Package Purchase

```
Customer registers → (Role: customer)
         ↓
Admin creates package → (10 sessions, 3 months validity)
         ↓
Payment recorded → (cash/bank/card)
         ↓
Customer can now book sessions
```

### 2. Booking Request Flow (24-Hour Rule)

```
Customer selects date/time → Check: >= 24 hours ahead?
         ↓ (YES)
Create Booking (status: pending)
         ↓
Admin reviews pending requests
         ↓
Admin confirms → Update status to 'confirmed'
         ↓
Sync to Google Calendar
         ↓
Send LINE notification to customer
         ↓
(Session happens)
         ↓
Teacher marks attendance
         ↓
Decrement package sessions (10 → 9)
```

**If < 24 hours**: Customer sees error message directing them to LINE for urgent bookings.

### 3. Package Session Tracking

```
Package created: totalSessions=10, remainingSessions=10
         ↓
Session 1 completed → remainingSessions=9
         ↓
Session 2 completed → remainingSessions=8
         ↓
...
         ↓
Session 10 completed → remainingSessions=0, status='used'
```

**No-show policy**: Configurable whether to decrement or not.

### 4. Notification System

```
Event triggers (booking confirmed, session tomorrow, etc.)
         ↓
Create Notification record → (scheduledFor: timestamp)
         ↓
Background worker runs every X minutes
         ↓
Find notifications where scheduledFor <= now
         ↓
Send via LINE API
         ↓
Update status to 'sent' (or 'failed' if error)
```

---

## 🎨 User Interfaces

### Public Website (/)

**Pages**:
- Homepage - Hero, features, CTA
- About - Studio story, mission
- Classes - Class types (private, group)
- Pricing - Package offerings
- Instructors - Teacher profiles
- Contact - Location, hours, contact form

**Navigation**: Simple navbar with login/register buttons

---

### Customer Portal (/customer/*)

**Dashboard** (`/customer/dashboard`)
- Current package widget (sessions remaining)
- Upcoming bookings (next 5)
- Quick stats (total sessions completed)
- Quick action buttons

**Packages** (`/customer/packages`)
- List of all packages (active/expired)
- Package details (sessions, validity, price)

**Book Session** (`/customer/calendar`)
- Date picker (next 14 days)
- Time slot selector (9 AM - 8 PM)
- Teacher selection
- Package selection
- **24-hour validation** before submission
- Notes field for special requests

**History** (`/customer/history`)
- Past sessions (completed, cancelled, no-show)
- Filter by date range

---

### Teacher Portal (/teacher/*)

**Dashboard** (`/teacher/dashboard`)
- Today's sessions
- Quick view of client health notes

**Sessions** (`/teacher/sessions`)
- Upcoming sessions (calendar view)
- Filter by date range

**Attendance** (inline in sessions)
- Mark as: Completed, No-show, Cancelled
- Add session notes

---

### Admin Portal (/admin/*)

**Dashboard** (`/admin/dashboard`)
- KPIs: Active customers, sessions this week, revenue
- Pending booking requests (priority view)
- Today's schedule

**Customers** (`/admin/customers`)
- List all customers (search, filter)
- Customer detail page:
  - Profile info
  - Active packages
  - Booking history
  - Add package
  - Add booking

**Bookings** (`/admin/bookings`)
- List view with filters (status, teacher, date)
- Pending requests with Confirm/Reject buttons
- Calendar view option

**Packages** (`/admin/packages`)
- Create new package
- Adjust sessions (with reason required)
- Change status (freeze, expire)

**Calendar** (`/admin/calendar`)
- Studio-wide calendar
- Color-coded by status
- Click to view/edit booking

**Reports** (`/admin/reports`)
- Revenue over time (chart)
- Sessions per teacher
- Package sales
- Export to CSV

---

## 🔐 Security & Authentication

### JWT-Based Authentication

**Flow**:
```
Login → Verify credentials
      ↓
Generate JWT (expires in 7 days)
      ↓
Return token + user info
      ↓
Client stores in localStorage
      ↓
Include in Authorization header for requests
```

**Token Payload**:
```typescript
{
  userId: string;
  role: 'admin' | 'teacher' | 'customer';
  email: string;
}
```

### Role-Based Access Control (RBAC)

**Middleware Chain**:
```
Request → authMiddleware (verify token, load user)
        ↓
        requireRole(['admin']) (check role)
        ↓
        Route handler
```

**Access Matrix**:
| Route                  | Customer | Teacher | Admin |
|------------------------|----------|---------|-------|
| `/api/customers/me`    | ✓        | ✗       | ✓     |
| `/api/bookings/request`| ✓        | ✗       | ✓     |
| `/api/bookings/:id/attendance` | ✗ | ✓   | ✓     |
| `/api/admin/*`         | ✗        | ✗       | ✓     |

---

## 🌍 Timezone Handling

**Challenge**: Studio operates in one timezone (e.g., Asia/Bangkok), but server might be elsewhere.

**Solution**:
- **Database**: Store all times in UTC
- **Backend**: Convert to studio timezone for business logic (24-hour rule)
- **Frontend**: Display times in studio timezone
- **Library**: `date-fns-tz` for conversions

**Example**:
```typescript
// Customer requests 2025-12-01 10:00 AM Bangkok time
const desiredTime = parseISO('2025-12-01T10:00:00'); // User input
const utcTime = zonedTimeToUtc(desiredTime, 'Asia/Bangkok'); // Store this
// Later, when displaying:
const displayTime = utcToZonedTime(utcTime, 'Asia/Bangkok'); // Show this
```

---

## 🔌 Integrations

### Google Calendar API

**Purpose**: Sync confirmed bookings to teacher's Google Calendar

**Flow**:
```
Admin confirms booking
      ↓
Look up teacher's CalendarConnection
      ↓
Use OAuth tokens to call Google Calendar API
      ↓
Create event: events.insert()
      ↓
Store googleCalendarEventId in booking
```

**Update/Delete**:
- Update booking → `events.update()`
- Cancel booking → `events.delete()`

**Setup Required**:
1. Create Google Cloud project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Implement OAuth flow for teachers to connect

---

### LINE Messaging API

**Purpose**: Send notifications to customers via LINE

**Flow**:
```
Event occurs (booking confirmed, session tomorrow)
      ↓
Create Notification record
      ↓
Background worker finds due notifications
      ↓
Get user's lineUserId
      ↓
Call LINE pushMessage API
      ↓
Update notification status to 'sent'
```

**Message Types**:
- Booking confirmed
- Booking rejected
- Reminder (24h before, 6h before)
- Inactive customer nudge (30 days)
- Promotional campaigns

**Setup Required**:
1. Create LINE Official Account
2. Get channel access token and secret
3. Set up webhook for user linking

---

## 📈 Future Enhancements

### Phase 2 (Short-term)
- [ ] Teacher portal completion
- [ ] Admin portal completion
- [ ] Google Calendar OAuth flow
- [ ] LINE webhook handler
- [ ] Background worker deployment
- [ ] Email notifications (backup channel)

### Phase 3 (Mid-term)
- [ ] Payment gateway (Stripe/PayPal)
- [ ] Online package purchases
- [ ] Teacher availability calendar
- [ ] Waitlist management
- [ ] Group class scheduling
- [ ] Mobile app (React Native)

### Phase 4 (Long-term)
- [ ] Multi-location support
- [ ] Franchise management
- [ ] Customer feedback system
- [ ] Loyalty rewards program
- [ ] Video library (for members)
- [ ] AI-powered session recommendations

---

## 🚀 Deployment Strategy

### Backend (API)

**Recommended Platforms**:
- **Railway** (easiest, good for MVP)
- **Render** (free tier available)
- **Heroku** (requires credit card)
- **AWS EC2** (more control, requires DevOps)

**Steps**:
1. Set environment variables
2. Connect MongoDB Atlas
3. Deploy: `npm run build && npm start`
4. Set up domain (optional)

---

### Frontend (Web)

**Recommended Platforms**:
- **Vercel** (best for Next.js, free tier)
- **Netlify** (alternative)

**Steps**:
1. Connect GitHub repo
2. Set `NEXT_PUBLIC_API_URL` to production API
3. Deploy automatically on push

---

### Database (MongoDB)

**Recommended**: MongoDB Atlas (free tier: 512MB)

**Steps**:
1. Create cluster
2. Whitelist IP (0.0.0.0/0 for development)
3. Create database user
4. Get connection string
5. Update `MONGODB_URI` in API env

---

## 📞 Support & Maintenance

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Set up log aggregation (LogDNA, Papertrail)

### Backups
- [ ] MongoDB automated backups (Atlas feature)
- [ ] Regular data exports
- [ ] Version control for code

### Updates
- [ ] Security patches (weekly check)
- [ ] Dependency updates (monthly)
- [ ] Feature releases (bi-weekly sprint)

---

## 🎓 Learning Resources

**For Backend**:
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [JWT Introduction](https://jwt.io/introduction)

**For Frontend**:
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hooks](https://react.dev/reference/react)

**For Integrations**:
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)

---

## ✅ What's Implemented

### Backend ✓
- [x] User authentication (JWT)
- [x] Role-based access control
- [x] Customer management
- [x] Package management
- [x] Booking system (with 24-hour rule)
- [x] Automatic session decrement
- [x] Teacher session views
- [x] Timezone handling
- [x] Data models and schemas
- [x] API endpoints
- [x] Error handling
- [x] Validation (Zod)

### Frontend ✓
- [x] Public homepage
- [x] Login/Register pages
- [x] Customer dashboard
- [x] Customer booking calendar
- [x] Package display
- [x] Responsive design
- [x] API client
- [x] Auth state management

### Infrastructure ✓
- [x] Monorepo setup
- [x] TypeScript configuration
- [x] Database seeding script
- [x] Environment configuration
- [x] Development tooling

---

## 📊 Current Status

**Production Ready**: 60%
- ✅ Core booking functionality
- ✅ Customer portal
- ⚠️ Teacher portal (partial)
- ⚠️ Admin portal (partial)
- ⚠️ Google Calendar (structure ready)
- ⚠️ LINE messaging (structure ready)

**Next Priority**:
1. Complete teacher attendance marking UI
2. Complete admin booking management UI
3. Implement Google Calendar OAuth
4. Implement LINE webhook
5. Deploy to production

---

**Last Updated**: 2025-01-26
**Version**: 1.0.0-beta
**Maintainer**: Development Team
