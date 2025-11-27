# 🔐 How to Sign In - Step by Step

## Current Status

✅ **Web server is running** on http://localhost:3000
❌ **API server is NOT running** (needed for login to work)

You need **both servers** running to sign in!

---

## 🚀 Start Both Servers

### Option 1: Start Both Together (Recommended)

Open your terminal in the core-studio folder and run:

```bash
npm run dev
```

This will start:
- `[0]` API server (port 5000) - Backend
- `[1]` Web server (port 3000) - Frontend (already running)

### Option 2: Start Separately

**Terminal 1 - API Server:**
```bash
cd api
npm run dev
```

**Terminal 2 - Web Server:**
```bash
cd web
npm run dev
```

---

## ⚠️ Important: Set Up MongoDB First!

**Before you can sign in, you MUST have MongoDB running!**

### Quick Option: MongoDB Atlas (Cloud - 5 minutes)

1. Go to https://cloud.mongodb.com
2. Sign up for free account
3. Create a free cluster (M0 - Free tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster.xxxxx.mongodb.net/
   ```
6. Edit `api\.env` file and update:
   ```
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster.xxxxx.mongodb.net/pilates-studio
   ```
7. Restart the API server (Ctrl+C and run `npm run dev` again)

### Local Option: Install MongoDB

1. Download from https://www.mongodb.com/try/download/community
2. Install MongoDB Community Server
3. It will run automatically as a Windows service
4. The `.env` file is already configured for local MongoDB

---

## 📊 Seed Test Data

**Once MongoDB is connected**, open a NEW terminal and run:

```bash
cd api
npm run seed
```

This creates test accounts you can use to sign in.

---

## 🔑 Sign In Credentials

After seeding, you can sign in with these accounts:

### Customer Account (Try booking sessions)
- **Email:** `john@example.com`
- **Password:** `customer123`
- Has a 10-session package ready to use!

### Admin Account (Approve bookings)
- **Email:** `admin@corestudio.com`
- **Password:** `admin123`

### Teacher Account (Mark attendance)
- **Email:** `sarah@corestudio.com`
- **Password:** `teacher123`

---

## 🌐 Access the Website

1. **Open browser:** http://localhost:3000
2. **Click "Sign In"** (top right)
3. **Enter credentials** (see above)
4. **You're in!**

---

## 🎯 What to Test After Sign In

### As Customer (john@example.com):
1. See your dashboard with 10 sessions
2. Click "Book Session"
3. Try to select TODAY → ❌ Should show error (24-hour rule!)
4. Select TOMORROW → ✅ Should work
5. Submit booking request
6. Status shows "pending" (waiting for admin approval)

### As Admin (admin@corestudio.com):
1. See pending booking request on dashboard
2. Click "Confirm" to approve
3. Booking changes to "confirmed"
4. (If Google Calendar connected, it syncs automatically)

### As Teacher (sarah@corestudio.com):
1. See today's sessions
2. Mark attendance after session
3. Package automatically decrements (10 → 9)

---

## 🔍 Troubleshooting

### "Cannot connect to database"
**Problem:** MongoDB not running or wrong connection string
**Solution:** Follow MongoDB setup steps above

### "Network Error" or "Failed to fetch"
**Problem:** API server not running
**Solution:** Run `npm run dev` from root folder

### "Invalid email or password"
**Problem:** Database not seeded
**Solution:** Run `cd api && npm run seed`

### Page shows white screen
**Problem:** Web server crashed
**Solution:** Check terminal for errors, restart with `npm run dev`

---

## 📋 Quick Checklist

Before trying to sign in:
- [ ] MongoDB is running (cloud or local)
- [ ] API server is running (port 5000)
- [ ] Web server is running (port 3000)
- [ ] Database has been seeded (`npm run seed`)
- [ ] You're using correct credentials (see above)

---

## 🎉 Success Indicators

You'll know everything is working when:

1. **Terminal shows:**
   ```
   [0] Server running on http://localhost:5000
   [1] ✓ Ready in 3.2s
   ```

2. **You can visit:**
   - http://localhost:5000/api/health (shows `{"status":"ok"}`)
   - http://localhost:3000 (shows website)

3. **You can sign in** and see your dashboard!

---

## Need Help?

1. Make sure both servers are running: `npm run dev`
2. Set up MongoDB Atlas (5 minutes): https://cloud.mongodb.com
3. Seed the database: `cd api && npm run seed`
4. Try signing in at http://localhost:3000

**Current Issue:** Your API server isn't running, so login won't work yet. Start it with `npm run dev`!
