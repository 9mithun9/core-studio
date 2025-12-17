import mongoose from 'mongoose';
import { Package, Booking } from '../src/models';
import { logger } from '../src/config/logger';
import { BookingStatus } from '../src/types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixPackageRemainingSessions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get all packages
    const packages = await Package.find();
    logger.info(`Found ${packages.length} packages to process`);

    for (const pkg of packages) {
      // Count CONFIRMED and COMPLETED bookings for this package
      // Sessions are deducted when CONFIRMED (reserved), not when COMPLETED
      const deductedCount = await Booking.countDocuments({
        packageId: pkg._id,
        status: { $in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      });

      // Calculate correct remaining sessions
      const correctRemaining = pkg.totalSessions - deductedCount;

      if (pkg.remainingSessions !== correctRemaining) {
        logger.info(
          `Package ${pkg._id} (${pkg.name}): ` +
          `Current remaining: ${pkg.remainingSessions}, ` +
          `Should be: ${correctRemaining} ` +
          `(Total: ${pkg.totalSessions}, Used (Confirmed+Completed): ${deductedCount})`
        );

        // Update the package
        pkg.remainingSessions = correctRemaining;

        // Update status if needed
        if (correctRemaining === 0 && pkg.status === 'active') {
          pkg.status = 'used';
          logger.info(`  -> Also updating status to 'used'`);
        } else if (correctRemaining > 0 && pkg.status === 'used') {
          pkg.status = 'active';
          logger.info(`  -> Also updating status to 'active'`);
        }

        await pkg.save();
        logger.info(`  -> Updated successfully`);
      }
    }

    logger.info('✅ Successfully fixed all package remaining sessions');
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing package remaining sessions:', error);
    process.exit(1);
  }
}

fixPackageRemainingSessions();
