import mongoose from 'mongoose';
import { Customer, Package, Booking } from '../src/models';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixHistoricalDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get all customers
    const customers = await Customer.find();
    logger.info(`Found ${customers.length} customers to process`);

    for (const customer of customers) {
      // Find all sessions for this customer, sorted by earliest first
      const sessions = await Booking.find({ customerId: customer._id })
        .sort({ startTime: 1 })
        .lean();

      if (sessions.length === 0) {
        logger.warn(`No sessions found for customer ${customer._id}, skipping`);
        continue;
      }

      // Get the earliest session date
      const earliestSessionDate = new Date(sessions[0].startTime);
      logger.info(`Customer ${customer._id}: Earliest session is ${earliestSessionDate.toISOString()}`);

      // Find all packages for this customer, sorted by oldest first
      const packages = await Package.find({ customerId: customer._id })
        .sort({ createdAt: 1 })
        .lean();

      if (packages.length === 0) {
        logger.warn(`No packages found for customer ${customer._id}, skipping`);
        continue;
      }

      // Set first package date to 1 day before earliest session (or same day if no sessions yet)
      const firstPackageDate = new Date(earliestSessionDate);
      firstPackageDate.setDate(firstPackageDate.getDate() - 1);

      // Update the first package's createdAt
      await Package.collection.updateOne(
        { _id: packages[0]._id },
        {
          $set: {
            createdAt: firstPackageDate,
            updatedAt: firstPackageDate,
          },
        }
      );

      logger.info(`Updated first package for customer ${customer._id}: set to ${firstPackageDate.toISOString()}`);

      // Update subsequent packages if any
      if (packages.length > 1) {
        for (let i = 1; i < packages.length; i++) {
          const pkg = packages[i];

          // Find sessions associated with this package
          const packageSessions = await Booking.find({
            customerId: customer._id,
            packageId: pkg._id,
          })
            .sort({ startTime: 1 })
            .lean();

          if (packageSessions.length > 0) {
            // Set package date to 1 day before first session of this package
            const packageDate = new Date(packageSessions[0].startTime);
            packageDate.setDate(packageDate.getDate() - 1);

            await Package.collection.updateOne(
              { _id: pkg._id },
              {
                $set: {
                  createdAt: packageDate,
                  updatedAt: packageDate,
                },
              }
            );

            logger.info(`Updated package ${i + 1} for customer ${customer._id}: set to ${packageDate.toISOString()}`);
          } else {
            // No sessions for this package yet, set it to after the previous package
            const previousPackageDate = new Date(
              i === 1 ? firstPackageDate : packages[i - 1].createdAt
            );
            const thisPackageDate = new Date(previousPackageDate);
            thisPackageDate.setMonth(thisPackageDate.getMonth() + 1); // 1 month after previous

            await Package.collection.updateOne(
              { _id: pkg._id },
              {
                $set: {
                  createdAt: thisPackageDate,
                  updatedAt: thisPackageDate,
                },
              }
            );

            logger.info(
              `Updated package ${i + 1} for customer ${customer._id} (no sessions): set to ${thisPackageDate.toISOString()}`
            );
          }
        }
      }

      // Update customer's createdAt to match first package date
      await Customer.collection.updateOne(
        { _id: customer._id },
        {
          $set: {
            createdAt: firstPackageDate,
            updatedAt: firstPackageDate,
          },
        }
      );

      logger.info(`Updated customer ${customer._id}: createdAt set to ${firstPackageDate.toISOString()}`);
    }

    logger.info('✅ Successfully fixed all historical dates');
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing historical dates:', error);
    process.exit(1);
  }
}

fixHistoricalDates();
