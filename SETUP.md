# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

This will install dependencies for:
- Root workspace
- API (backend)
- Web (frontend)

### 2. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Visit: https://www.mongodb.com/try/download/community

# Start MongoDB
mongod --dbpath /path/to/your/data
```

**Option B: MongoDB Atlas (Cloud - Recommended)**
```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create a free account
# 3. Create a new cluster
# 4. Get your connection string (looks like):
#    mongodb+srv://username:password@cluster.xxxxx.mongodb.net/pilates-studio
```

### 3. Configure Environment Variables

**Backend (.env):**
```bash
cd api
cp .env.example .env
# Edit .env with your settings
```

Minimum required settings:
```env
MONGODB_URI=mongodb://localhost:27017/pilates-studio
JWT_SECRET=change-this-to-a-random-secret-string
STUDIO_TIMEZONE=Asia/Bangkok
```

**Frontend (.env.local):**
```bash
cd ../web
cp .env.local.example .env.local
# Edit .env.local
```

Required settings:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Start Development

**Option A: Both servers at once (recommended)**
```bash
# From root directory
npm run dev
```

**Option B: Separate terminals**
```bash
# Terminal 1 - Backend
cd api
npm run dev

# Terminal 2 - Frontend
cd web
npm run dev
```

### 5. Access the Application

Open your browser:
- **Website**: http://localhost:3000
- **API**: http://localhost:5000/api/health

### 6. Create Your First Admin User

You'll need to create an admin user directly in MongoDB:

**Option A: Using MongoDB Compass (GUI)**
1. Download MongoDB Compass
2. Connect to your database
3. Navigate to `pilates-studio` database
4. Insert into `users` collection:

```json
{
  "role": "admin",
  "name": "Admin User",
  "email": "admin@corestudio.com",
  "phone": "+66123456789",
  "passwordHash": "$2a$10$YourHashedPasswordHere",
  "status": "active",
  "lineUserId": null,
  "createdAt": { "$date": "2025-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2025-01-01T00:00:00.000Z" }
}
```

**Option B: Use the register endpoint, then update role**
1. Register normally at http://localhost:3000/auth/register
2. Use MongoDB Compass to change the `role` field from `customer` to `admin`

**Option C: Use this Node.js script**

Create `api/scripts/createAdmin.js`:
```javascript
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

async function createAdmin() {
  await mongoose.connect('mongodb://localhost:27017/pilates-studio');

  const User = mongoose.model('User', new mongoose.Schema({
    role: String,
    name: String,
    email: String,
    phone: String,
    passwordHash: String,
    status: String,
  }));

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await User.create({
    role: 'admin',
    name: 'Admin',
    email: 'admin@corestudio.com',
    phone: '+66123456789',
    passwordHash,
    status: 'active',
  });

  console.log('Admin created:', admin.email);
  process.exit(0);
}

createAdmin();
```

Run it:
```bash
cd api
node scripts/createAdmin.js
```

### 7. Test the Setup

1. **Register a customer**:
   - Go to http://localhost:3000
   - Click "Get Started" or "Sign Up"
   - Fill in the registration form
   - You'll be redirected to customer dashboard

2. **Login as admin**:
   - Go to http://localhost:3000/auth/login
   - Use admin credentials
   - You'll be redirected to admin dashboard (when built)

3. **Test API health**:
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

## Common Issues

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running. Start it with `mongod`.

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Kill the process using the port: `npx kill-port 5000`
- Or change the port in `api/.env`: `PORT=5001`

### Module Not Found
```
Error: Cannot find module '@/config/db'
```
**Solution**: Make sure you ran `npm install` in the correct directory.

### TypeScript Errors
```
TSError: ⨯ Unable to compile TypeScript
```
**Solution**:
- Check your `tsconfig.json` paths
- Make sure all dependencies are installed
- Try: `npm run build` to see detailed errors

## Next Steps

After setup is complete:

1. **Create sample data**:
   - Create a teacher user
   - Create some packages for customers
   - Create test bookings

2. **Customize**:
   - Update studio name in env files
   - Change colors in `tailwind.config.ts`
   - Add your logo

3. **Deploy**:
   - See deployment section in main README
   - Set up production environment variables
   - Configure Google Calendar API
   - Set up LINE Messaging API

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Look at the code comments
- Check API endpoint documentation in README
- Open an issue if you find bugs

## Development Workflow

```bash
# 1. Make changes to code
# 2. Hot reload will update automatically
# 3. Test in browser
# 4. Commit changes

git add .
git commit -m "Your message"
git push
```

That's it! You're ready to build a comprehensive Pilates studio platform. 🎉
