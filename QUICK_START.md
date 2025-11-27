# Quick Start Guide - Get Running in 5 Minutes

## ✅ Step 1: Dependencies Installed

The `npm install` command is currently running and will install all dependencies.

## 📝 Step 2: Set Up MongoDB

You need MongoDB running. Choose one option:

### Option A: Install MongoDB Locally (Windows)

1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install with default settings
3. MongoDB will run as a Windows service automatically
4. Verify it's running: Open Services (services.msc) and look for "MongoDB"

### Option B: Use MongoDB Atlas (Cloud - Easier!)

1. Go to https://cloud.mongodb.com
2. Create free account
3. Create free cluster (M0 Sandbox)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Update `api/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/pilates-studio
   ```

## 🚀 Step 3: Start the Application

Once npm install finishes, run:

```bash
# Start API + Web together
npm run dev
```

This starts:
- API server on http://localhost:5000
- Web server on http://localhost:3000

## 🎯 Step 4: Seed Test Data

Open a NEW terminal and run:

```bash
cd api
npm run seed
```

This creates:
- 1 Admin user
- 2 Teachers
- 3 Customers with active packages
- Message templates

## 🔑 Step 5: Login & Test

Visit http://localhost:3000

**Login as Customer:**
- Email: `john@example.com`
- Password: `customer123`

**Try booking a session:**
1. Click "Book Session"
2. Select a date (must be 24+ hours ahead)
3. Select time and teacher
4. Submit request
5. See "pending" status

**Login as Admin:**
- Email: `admin@corestudio.com`
- Password: `admin123`

**Approve the booking:**
1. See pending request on dashboard
2. Click "Confirm"
3. Booking syncs to Google Calendar (when configured)
4. LINE notification sent (when configured)

## ⚡ Quick Commands

```bash
# Start everything
npm run dev

# Seed database
cd api && npm run seed

# Start worker (in separate terminal)
cd worker && npm run dev

# Check API health
curl http://localhost:5000/api/health
```

## 🐛 Troubleshooting

**MongoDB not connecting?**
- Make sure MongoDB service is running
- Or use MongoDB Atlas cloud database

**Port already in use?**
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

**Can't login?**
- Make sure you ran `npm run seed`
- Check MongoDB is connected
- Check browser console for errors

## 🎉 You're Ready!

Once you see both servers running:
```
API: http://localhost:5000  ✓
Web: http://localhost:3000  ✓
```

You have a fully functional Pilates studio platform!

---

**Next Steps:**
- Explore the customer portal
- Try the booking system
- Check out the admin dashboard
- Set up Google Calendar integration
- Set up LINE messaging

**Full documentation:** See README.md, SETUP.md, and COMPLETE_SYSTEM_GUIDE.md
