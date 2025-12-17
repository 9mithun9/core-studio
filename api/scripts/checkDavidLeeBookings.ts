import mongoose from 'mongoose';
import { Booking } from '../src/models/Booking';
import { Customer } from '../src/models/Customer';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkDavidLee() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const davidUser = await User.findOne({ name: 'David Lee' });
    const davidCustomer = await Customer.findOne({ userId: davidUser!._id });
    const davidPackage = await Package.findOne({ customerId: davidCustomer!._id });

    console.log('Package ID:', davidPackage!._id);
    console.log('Total Sessions:', davidPackage!.totalSessions);
    console.log('Remaining Sessions:', davidPackage!.remainingSessions);

    const allBookings = await Booking.find({ packageId: davidPackage!._id }).sort({ startTime: 1 });
    console.log('\n=== All bookings:', allBookings.length, '===');

    allBookings.forEach((b, i) => {
      console.log(`${i + 1}. Status: ${b.status}, Start: ${b.startTime.toISOString()}`);
    });

    const completed = await Booking.countDocuments({
      packageId: davidPackage!._id,
      status: { $in: ['completed', 'noShow'] }
    });

    const upcoming = await Booking.countDocuments({
      packageId: davidPackage!._id,
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $gte: new Date() }
    });

    console.log('\n=== Counts ===');
    console.log('Completed count:', completed);
    console.log('Upcoming count:', upcoming);
    console.log('Calculated remaining:', davidPackage!.totalSessions - completed - upcoming);
    console.log('Formula check:', completed, '+', upcoming, '+', (davidPackage!.totalSessions - completed - upcoming), '=', davidPackage!.totalSessions);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

checkDavidLee();
