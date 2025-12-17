import mongoose from 'mongoose';
import { Booking } from '../src/models/Booking';
import { Customer } from '../src/models/Customer';
import { User } from '../src/models/User';
import { Package } from '../src/models/Package';
import { BookingStatus } from '../src/types';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function verifyAllCustomers() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB\n');

    const customers = await Customer.find({}).populate('userId');
    console.log(`Checking ${customers.length} customers...\n`);

    let allCorrect = true;

    for (const customer of customers) {
      const user = await User.findOne({ _id: customer.userId });
      if (!user) continue;

      const packages = await Package.find({ customerId: customer._id });

      for (const pkg of packages) {
        // Count completed (including past confirmed)
        const completedCount = await Booking.countDocuments({
          packageId: pkg._id,
          $or: [
            { status: { $in: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW] } },
            { status: BookingStatus.CONFIRMED, endTime: { $lt: new Date() } }
          ],
        });

        // Count upcoming
        const upcomingCount = await Booking.countDocuments({
          packageId: pkg._id,
          status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startTime: { $gte: new Date() },
        });

        const remainingUnbooked = pkg.totalSessions - completedCount - upcomingCount;
        const sum = completedCount + upcomingCount + remainingUnbooked;
        const isCorrect = sum === pkg.totalSessions;

        if (!isCorrect) {
          allCorrect = false;
          console.log(`❌ ${user.name} - ${pkg.name}`);
          console.log(`   Total: ${pkg.totalSessions}`);
          console.log(`   Completed: ${completedCount}, Upcoming: ${upcomingCount}, Remaining: ${remainingUnbooked}`);
          console.log(`   Sum: ${sum} (should be ${pkg.totalSessions})`);
          console.log('');
        } else {
          console.log(`✓ ${user.name} - ${pkg.name}: ${completedCount} + ${upcomingCount} + ${remainingUnbooked} = ${pkg.totalSessions}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    if (allCorrect) {
      console.log('✅ All customers have correct calculations!');
    } else {
      console.log('❌ Some customers have incorrect calculations!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

verifyAllCustomers();
