import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Booking } from '../src/models';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

/**
 * Migration script to mark existing auto-confirmed bookings
 * Identifies bookings with auto-confirm notes and sets autoConfirmed flag to true
 */
async function markExistingAutoConfirmedBookings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('🔍 Searching for existing auto-confirmed bookings...');

    // Find all bookings with the auto-confirm note
    const result = await Booking.updateMany(
      {
        notes: { $regex: /Auto-confirmed after 12 hours/i },
        autoConfirmed: { $ne: true } // Only update if not already marked
      },
      {
        $set: { autoConfirmed: true }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} existing auto-confirmed booking(s)`);

    // Show some examples
    const autoConfirmedBookings = await Booking.find({ autoConfirmed: true })
      .populate('customerId')
      .populate('teacherId')
      .limit(5)
      .lean();

    if (autoConfirmedBookings.length > 0) {
      console.log(`📋 Sample auto-confirmed bookings:`);
      autoConfirmedBookings.forEach((booking: any) => {
        console.log(`  - Booking ${booking._id}: ${booking.customerId?.userId?.name || 'N/A'} with ${booking.teacherId?.userId?.name || 'N/A'}`);
      });
    }

    await mongoose.disconnect();
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

markExistingAutoConfirmedBookings();
