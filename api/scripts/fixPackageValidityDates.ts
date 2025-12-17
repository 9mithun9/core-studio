import mongoose from 'mongoose';
import { Package } from '../src/models';
import { PackageStatus } from '../src/types';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixPackageValidityDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const packages = await Package.find();
    logger.info(`Found ${packages.length} packages to process`);

    const now = new Date();

    for (const pkg of packages) {
      const createdAt = pkg.createdAt;
      const validityMonths = 12; // 1 year validity for all packages

      // Set validFrom to package creation date
      const validFrom = new Date(createdAt);

      // Set validTo to 12 months (1 year) after creation
      const validTo = new Date(createdAt);
      validTo.setMonth(validTo.getMonth() + validityMonths);

      // Determine status based on dates
      let status = pkg.status;
      if (validTo < now) {
        status = PackageStatus.EXPIRED;
      } else if (pkg.remainingSessions === 0) {
        status = PackageStatus.USED;
      } else {
        status = PackageStatus.ACTIVE;
      }

      await Package.collection.updateOne(
        { _id: pkg._id },
        {
          $set: {
            validFrom: validFrom,
            validTo: validTo,
            status: status,
          },
        }
      );

      logger.info(
        `Updated package ${pkg._id}: validFrom=${validFrom.toISOString()}, validTo=${validTo.toISOString()}, status=${status}`
      );
    }

    logger.info('✅ Successfully fixed all package validity dates');
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing package validity dates:', error);
    process.exit(1);
  }
}

fixPackageValidityDates();
