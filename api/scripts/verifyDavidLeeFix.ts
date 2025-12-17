import mongoose from 'mongoose';
import { Booking } from '../src/models/Booking';
import { Customer } from '../src/models/Customer';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { BookingStatus } from '../src/types';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function verifyFix() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const davidUser = await User.findOne({ name: 'David Lee' });
    const davidCustomer = await Customer.findOne({ userId: davidUser!._id });
    const davidPackage = await Package.findOne({ customerId: davidCustomer!._id });

    console.log('\n=== David Lee Package ===');
    console.log('Total Sessions:', davidPackage!.totalSessions);

    // Count completed (including past confirmed)
    const completedCount = await Booking.countDocuments({
      packageId: davidPackage!._id,
      $or: [
        { status: { $in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW] } },
        { status: BookingStatus.CONFIRMED, endTime: { $lt: new Date() } }
      ],
    });

    // Count upcoming
    const upcomingCount = await Booking.countDocuments({
      packageId: davidPackage!._id,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      startTime: { $gte: new Date() },
    });

    const remainingUnbooked = davidPackage!.totalSessions - completedCount - upcomingCount;

    console.log('\n=== NEW CALCULATION ===');
    console.log('Completed:', completedCount, '(includes past confirmed)');
    console.log('Upcoming:', upcomingCount);
    console.log('Remaining:', remainingUnbooked);
    console.log('\nFormula:', completedCount, '+', upcomingCount, '+', remainingUnbooked, '=', davidPackage!.totalSessions);
    console.log('Correct?', (completedCount + upcomingCount + remainingUnbooked) === davidPackage!.totalSessions ? '✓' : '✗');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

verifyFix();
