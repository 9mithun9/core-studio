import mongoose from 'mongoose';
import { Booking } from '../src/models';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixPastSessionsStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get current date/time
    const now = new Date();
    logger.info(`Current time: ${now.toISOString()}`);

    // Find all bookings that:
    // 1. End time is in the past
    // 2. Status is 'confirmed' or 'pending'
    const pastBookings = await Booking.find({
      endTime: { $lt: now },
      status: { $in: ['confirmed', 'pending'] },
    });

    logger.info(`Found ${pastBookings.length} past sessions with confirmed/pending status`);

    if (pastBookings.length === 0) {
      logger.info('✅ No sessions to update');
      process.exit(0);
      return;
    }

    // Log details of sessions to be updated
    for (const booking of pastBookings) {
      logger.info(
        `  - Booking ${booking._id}: ${booking.status} -> completed (ended: ${booking.endTime.toISOString()})`
      );
    }

    // Update all past sessions to 'completed'
    const result = await Booking.updateMany(
      {
        endTime: { $lt: now },
        status: { $in: ['confirmed', 'pending'] },
      },
      {
        $set: { status: 'completed' },
      }
    );

    logger.info(`✅ Successfully updated ${result.modifiedCount} sessions to 'completed' status`);
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing past sessions status:', error);
    process.exit(1);
  }
}

fixPastSessionsStatus();
