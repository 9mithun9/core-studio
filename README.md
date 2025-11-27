# Core Studio Pilates - Full Platform

A comprehensive Pilates studio management system with public website, customer portal, teacher portal, and admin dashboard.

## 🎯 Features

### Public Website
- Modern, responsive homepage
- Class information and pricing
- Instructor profiles
- Contact information
- User registration and authentication

### Customer Portal
- Personal dashboard with package overview
- View remaining sessions (10 → 9 → 8...)
- Request bookings (with 24-hour advance rule)
- View upcoming and past sessions
- Package history and details

### Teacher Portal
- View today's sessions
- View upcoming schedule
- Mark attendance (completed, no-show, cancelled)
- Access student health notes

### Admin Portal
- Manage customers, packages, and bookings
- Approve/reject booking requests
- Create packages and track payments
- View reports and analytics
- Manage teacher schedules

### Integrations
- **Google Calendar**: Auto-sync confirmed bookings to teacher calendars
- **LINE Messaging**: Send confirmations, reminders, and notifications
- **Background Worker**: Automated notifications and reminders

## 🏗️ Tech Stack

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **MongoDB** with **Mongoose**
- **JWT** authentication
- **Google Calendar API**
- **LINE Messaging API**

### Frontend
- **Next.js 15** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Axios** for API calls

## 📁 Project Structure

```
core-studio/
├── api/                          # Backend API
│   ├── src/
│   │   ├── config/              # Configuration (DB, env, logger)
│   │   ├── models/              # Mongoose models
│   │   ├── modules/             # Feature modules
│   │   │   ├── auth/           # Authentication
│   │   │   ├── bookings/       # Booking management
│   │   │   ├── customers/      # Customer management
│   │   │   ├── packages/       # Package management
│   │   │   └── teachers/       # Teacher management
│   │   ├── middlewares/        # Auth, role, error handling
│   │   ├── utils/              # JWT, password, time, validation
│   │   ├── routes/             # Route definitions
│   │   └── server.ts           # Express app entry point
│   ├── package.json
│   └── tsconfig.json
│
├── web/                         # Next.js frontend
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── page.tsx       # Homepage
│   │   │   ├── auth/          # Login/Register
│   │   │   ├── customer/      # Customer portal
│   │   │   ├── teacher/       # Teacher portal
│   │   │   └── admin/         # Admin portal
│   │   ├── components/        # Reusable components
│   │   │   └── ui/           # UI components
│   │   └── lib/              # API client, auth, utilities
│   ├── package.json
│   ├── next.config.mjs
│   └── tailwind.config.ts
│
├── worker/                     # Background worker (future)
│   └── src/
│       ├── jobs/
│       │   ├── sendNotifications.ts
│       │   └── checkExpiredPackages.ts
│       └── index.ts
│
├── package.json               # Root workspace config
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **MongoDB** 4.4+
- **npm** or **yarn**

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd core-studio

# Install dependencies for all workspaces
npm install
```

### 2. Set Up MongoDB

```bash
# Start MongoDB (if using local instance)
mongod --dbpath /path/to/your/data

# Or use MongoDB Atlas (cloud)
# Get your connection string from https://cloud.mongodb.com
```

### 3. Configure Environment Variables

**API (.env file in `/api` directory):**

```bash
cd api
cp .env.example .env
```

Edit `api/.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pilates-studio

JWT_SECRET=your-super-secret-jwt-key-change-in-production
STUDIO_TIMEZONE=Asia/Bangkok
STUDIO_NAME=Core Studio Pilates

# Google Calendar (optional for now)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LINE Messaging (optional for now)
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_CHANNEL_SECRET=your-line-secret
```

**Web (.env.local file in `/web` directory):**

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

### 4. Start Development Servers

**Option A: Start both servers together (recommended)**

```bash
# From root directory
npm run dev
```

**Option B: Start servers separately**

```bash
# Terminal 1 - API server
cd api
npm run dev

# Terminal 2 - Web server
cd web
npm run dev
```

### 5. Access the Application

- **Website**: http://localhost:3000
- **API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health

## 🔑 Core Features Explained

### 24-Hour Booking Rule

Customers can only request bookings **at least 24 hours in advance**. This is enforced:

1. **Backend** (`api/src/modules/bookings/bookings.controller.ts`):
   - `isBookingTimeValid()` checks desired time against current time in studio timezone
   - Returns error if less than 24 hours

2. **Frontend** (`web/src/app/customer/calendar/page.tsx`):
   - Client-side validation before submitting
   - Clear error message directing users to LINE for urgent bookings

### Package Session Tracking

Automatic countdown from purchased packages:

1. **Admin creates package**: Sets `totalSessions` and `remainingSessions`
2. **Customer books**: Request created with status `pending`
3. **Admin confirms**: Status changes to `confirmed`
4. **Teacher marks attendance**:
   - If `completed` or `noShow`: `remainingSessions` decrements by 1
   - If `remainingSessions === 0`: Package status becomes `used`

### Booking Workflow

```
Customer → Request Booking (pending)
         ↓
Admin → Confirm/Reject
         ↓ (if confirmed)
Sync to Google Calendar
         ↓
Send LINE notification
         ↓
Session happens
         ↓
Teacher → Mark Attendance
         ↓
Decrement package sessions
```

## 📊 Database Models

### User
- Core identity (login credentials)
- Roles: `admin`, `teacher`, `customer`
- Links to role-specific profiles

### Customer
- Extends User for customers
- Health notes, emergency contact
- Preferred teacher

### Teacher
- Extends User for teachers
- Bio, specialties, hourly rate
- Google Calendar connection

### Package
- Customer's purchased session bundle
- Tracks total and remaining sessions
- Validity period and status

### Booking
- Scheduled session
- Status: pending → confirmed → completed
- Links to customer, teacher, package

### Payment
- Payment record for packages
- Amount, method, reference code

### Notification
- Scheduled/sent notifications
- LINE messages for confirmations, reminders

## 🔐 Authentication & Authorization

### JWT Authentication
- Access tokens (7 days default)
- Refresh tokens (30 days default)
- Stored in localStorage

### Role-Based Access Control
- `authMiddleware`: Verifies JWT and loads user
- `requireRole()`: Checks user role
- Three main roles: `admin`, `teacher`, `customer`

### Protected Routes

**Customer routes:** `/customer/*`
- Requires `customer` or `admin` role
- Can only see own data

**Teacher routes:** `/teacher/*`
- Requires `teacher` or `admin` role

**Admin routes:** `/admin/*`
- Requires `admin` role
- Full access to all data

## 📱 API Endpoints

### Authentication
```
POST   /api/auth/register       - Register new customer
POST   /api/auth/login          - Login
GET    /api/auth/me             - Get current user
POST   /api/auth/logout         - Logout
```

### Customers
```
GET    /api/customers                  - List all customers (admin)
GET    /api/customers/:id              - Get customer by ID (admin)
GET    /api/customers/me/overview      - Get current customer overview
PATCH  /api/customers/:id              - Update customer (admin)
```

### Packages
```
POST   /api/packages                         - Create package (admin)
GET    /api/packages/me                      - Get my packages (customer)
GET    /api/packages/customer/:customerId    - Get customer packages (admin)
PATCH  /api/packages/:id                     - Update package (admin)
```

### Bookings
```
POST   /api/bookings/request           - Request booking (customer)
GET    /api/bookings/me                - Get my bookings (customer)
GET    /api/bookings/pending           - Get pending requests (admin)
GET    /api/bookings                   - Get all bookings (admin)
PATCH  /api/bookings/:id/confirm       - Confirm booking (admin)
PATCH  /api/bookings/:id/reject        - Reject booking (admin)
PATCH  /api/bookings/:id/attendance    - Mark attendance (teacher)
```

### Teachers
```
GET    /api/teachers                    - List all teachers (public)
GET    /api/teachers/sessions/today     - Today's sessions (teacher)
GET    /api/teachers/sessions           - All sessions (teacher)
```

## 🎨 Frontend Pages

### Public Pages
- `/` - Homepage
- `/about` - About the studio
- `/classes` - Class information
- `/pricing` - Pricing packages
- `/instructors` - Instructor profiles

### Auth Pages
- `/auth/login` - Login page
- `/auth/register` - Registration page

### Customer Portal
- `/customer/dashboard` - Main dashboard
- `/customer/packages` - View packages
- `/customer/calendar` - Book sessions
- `/customer/history` - Session history

### Teacher Portal
- `/teacher/dashboard` - Today's sessions
- `/teacher/sessions` - All sessions
- `/teacher/schedule` - Weekly schedule

### Admin Portal
- `/admin/dashboard` - Overview & KPIs
- `/admin/customers` - Customer management
- `/admin/bookings` - Booking management
- `/admin/calendar` - Studio calendar
- `/admin/packages` - Package management
- `/admin/reports` - Analytics & reports

## 🔧 Development Tips

### Adding a New Feature

1. **Backend**:
   - Create model in `api/src/models/`
   - Create controller in `api/src/modules/[feature]/`
   - Create routes in `api/src/modules/[feature]/[feature].routes.ts`
   - Add to `api/src/routes/index.ts`

2. **Frontend**:
   - Create page in `web/src/app/[role]/[feature]/page.tsx`
   - Add components in `web/src/components/`
   - Add API calls using `apiClient`

### Testing the API

Use **Postman**, **Insomnia**, or **curl**:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+66123456789",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Use the returned token for authenticated requests
curl -X GET http://localhost:5000/api/customers/me/overview \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🚀 Deployment

### Backend Deployment (Heroku, Railway, Render)

1. Set environment variables
2. Ensure MongoDB is accessible (use MongoDB Atlas)
3. Deploy:

```bash
cd api
npm run build
npm start
```

### Frontend Deployment (Vercel, Netlify)

1. Set `NEXT_PUBLIC_API_URL` to your production API URL
2. Deploy:

```bash
cd web
npm run build
npm start
```

## 📝 Next Steps / Future Enhancements

### Google Calendar Integration
- Complete OAuth flow for teachers
- Auto-sync confirmed bookings
- Handle calendar updates/deletions

### LINE Messaging
- Implement webhook handler
- Send booking confirmations
- Send 24h and 6h reminders
- Inactive customer nudges
- Promotional campaigns

### Background Worker
- Create cron jobs for:
  - Sending scheduled notifications
  - Checking expired packages
  - Generating reports
  - Inactive user detection

### Payment Gateway
- Integrate Stripe/PayPal
- Online package purchases
- Receipt generation

### Advanced Features
- Teacher availability calendar
- Multi-location support
- Waitlist management
- Group class scheduling
- Mobile app (React Native)
- Customer feedback system
- Loyalty rewards program

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for Core Studio Pilates.

## 💬 Support

For questions or issues:
- Email: dev@corestudio.com
- Create an issue in the repository

---

**Built with ❤️ for Core Studio Pilates**
