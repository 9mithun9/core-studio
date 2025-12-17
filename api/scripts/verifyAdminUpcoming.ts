import mongoose from 'mongoose';
import { Booking } from '../src/models/Booking';
import { Customer } from '../src/models/Customer';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { BookingStatus } from '../src/types';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function verifyAdminUpcoming() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const davidUser = await User.findOne({ name: 'David Lee' });
    const davidCustomer = await Customer.findOne({ userId: davidUser!._id });
    const davidPackage = await Package.findOne({ customerId: davidCustomer!._id });

    // Get all sessions for David
    const sessions = await Booking.find({ packageId: davidPackage!._id }).sort({ startTime: 1 });
    const now = new Date();

    console.log('\n=== David Lee Sessions ===');
    console.log('Total bookings:', sessions.length);

    // Count upcoming sessions using admin panel logic
    const upcomingSessions = sessions.filter((s) =>
      (s.status === BookingStatus.PENDING || s.status === BookingStatus.CONFIRMED) &&
      new Date(s.startTime) >= now
    ).length;

    const completedSessions = sessions.filter((s) =>
      s.status === BookingStatus.COMPLETED ||
      s.status === BookingStatus.NO_SHOW ||
      (s.status === BookingStatus.CONFIRMED && new Date(s.endTime) < now)
    ).length;

    console.log('\n=== Admin Panel Counts ===');
    console.log('Completed sessions:', completedSessions);
    console.log('Upcoming sessions:', upcomingSessions);
    console.log('Total:', completedSessions + upcomingSessions);

    // Show which sessions are upcoming
    console.log('\n=== Upcoming Sessions Details ===');
    sessions.forEach((s) => {
      const startTime = new Date(s.startTime);
      if ((s.status === BookingStatus.PENDING || s.status === BookingStatus.CONFIRMED) && startTime >= now) {
        console.log(`- ${s.status.toUpperCase()}: ${startTime.toISOString()}`);
      }
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

verifyAdminUpcoming();
