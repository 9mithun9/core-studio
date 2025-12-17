import mongoose from 'mongoose';
import { Package } from '../src/models';
import { PackageStatus } from '../src/types';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function updateExpiredPackages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const now = new Date();

    // Find all packages that are expired (validTo < now) but still marked as active
    const expiredPackages = await Package.find({
      validTo: { $lt: now },
      status: { $in: [PackageStatus.ACTIVE] },
    });

    logger.info(`Found ${expiredPackages.length} expired packages to update`);

    for (const pkg of expiredPackages) {
      await Package.updateOne(
        { _id: pkg._id },
        { $set: { status: PackageStatus.EXPIRED } }
      );
      logger.info(`Updated package ${pkg._id} to EXPIRED status (validTo: ${pkg.validTo.toISOString()})`);
    }

    logger.info('✅ Successfully updated all expired packages');
    process.exit(0);
  } catch (error) {
    logger.error('Error updating expired packages:', error);
    process.exit(1);
  }
}

updateExpiredPackages();
