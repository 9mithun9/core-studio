import mongoose from 'mongoose';
import { Booking } from '../src/models';
import { logger } from '../src/config/logger';
import { BookingStatus } from '../src/types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixPastConfirmedSessions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get current date/time
    const now = new Date();
    logger.info(`Current time: ${now.toISOString()}`);

    // Find all bookings that:
    // 1. End time is in the past
    // 2. Status is 'confirmed'
    const pastConfirmedBookings = await Booking.find({
      endTime: { $lt: now },
      status: BookingStatus.CONFIRMED,
    });

    logger.info(`Found ${pastConfirmedBookings.length} past sessions with 'confirmed' status`);

    if (pastConfirmedBookings.length === 0) {
      logger.info('✅ No sessions to update');
      process.exit(0);
      return;
    }

    // Log details of sessions to be updated
    for (const booking of pastConfirmedBookings) {
      logger.info(
        `  - Booking ${booking._id}: confirmed -> completed (ended: ${booking.endTime.toISOString()})`
      );
    }

    // Update all past confirmed sessions to 'completed'
    const result = await Booking.updateMany(
      {
        endTime: { $lt: now },
        status: BookingStatus.CONFIRMED,
      },
      {
        $set: {
          status: BookingStatus.COMPLETED,
          attendanceMarkedAt: now,
        },
      }
    );

    logger.info(`✅ Successfully updated ${result.modifiedCount} sessions to 'completed' status`);
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing past confirmed sessions:', error);
    process.exit(1);
  }
}

fixPastConfirmedSessions();
