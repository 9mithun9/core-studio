import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Booking, Teacher, Customer, User } from '../src/models';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkAutoConfirmedBookings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // Find Pratinya Wongsa
    const pratinyaUser = await User.findOne({ name: /Pratinya/i });
    if (!pratinyaUser) {
      console.log('❌ Could not find Pratinya Wongsa user');
      await mongoose.disconnect();
      return;
    }

    const pratinya = await Teacher.findOne({ userId: pratinyaUser._id });
    if (!pratinya) {
      console.log('❌ Could not find Pratinya teacher profile');
      await mongoose.disconnect();
      return;
    }

    console.log(`✓ Found Pratinya Wongsa (Teacher ID: ${pratinya._id})`);

    // Find all bookings with auto-confirm notes
    const bookingsWithNotes = await Booking.find({
      teacherId: pratinya._id,
      notes: { $regex: /Auto-confirmed after 12 hours/i }
    })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .lean();

    console.log(`\n📋 Found ${bookingsWithNotes.length} booking(s) with auto-confirm notes for Pratinya:`);
    bookingsWithNotes.forEach((booking: any) => {
      console.log(`\n  Booking ID: ${booking._id}`);
      console.log(`  Customer: ${booking.customerId?.userId?.name || 'N/A'}`);
      console.log(`  Teacher: ${booking.teacherId?.userId?.name || 'N/A'}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Auto-Confirmed Flag: ${booking.autoConfirmed}`);
      console.log(`  Start Time: ${booking.startTime}`);
      console.log(`  Notes: ${booking.notes?.substring(0, 100)}...`);
    });

    // Check all auto-confirmed bookings (with flag)
    const autoConfirmedBookings = await Booking.find({
      teacherId: pratinya._id,
      autoConfirmed: true
    })
      .populate({
        path: 'customerId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .lean();

    console.log(`\n📊 Found ${autoConfirmedBookings.length} booking(s) with autoConfirmed=true for Pratinya:`);
    autoConfirmedBookings.forEach((booking: any) => {
      console.log(`\n  Booking ID: ${booking._id}`);
      console.log(`  Customer: ${booking.customerId?.userId?.name || 'N/A'}`);
      console.log(`  Status: ${booking.status}`);
      console.log(`  Start Time: ${booking.startTime}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

checkAutoConfirmedBookings();
