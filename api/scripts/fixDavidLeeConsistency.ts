import mongoose from 'mongoose';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixDavidLeeConsistency() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Direct MongoDB operations to bypass schema restrictions
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const customersCollection = db.collection('customers');
    const packagesCollection = db.collection('packages');
    const bookingsCollection = db.collection('bookings');

    // Find David Lee
    const davidUser = await usersCollection.findOne({ name: 'David Lee' });
    if (!davidUser) {
      logger.error('David Lee not found');
      process.exit(1);
    }

    const customer = await customersCollection.findOne({ userId: davidUser._id });
    const pkg = await packagesCollection.findOne({ customerId: customer._id });
    const earliestBooking = await bookingsCollection.findOne(
      { packageId: pkg._id },
      { sort: { startTime: 1 } }
    );

    if (!earliestBooking) {
      logger.error('No bookings found for David Lee');
      process.exit(1);
    }

    const earliestSessionDate = new Date(earliestBooking.startTime);

    // Set all dates to be consistent with earliest session (October 5, 2025)
    const newDate = new Date(earliestSessionDate);
    newDate.setHours(9, 0, 0, 0); // 9 AM on Oct 5, 2025

    logger.info('\n=== BEFORE FIX ===');
    logger.info(`User created: ${davidUser.createdAt}`);
    logger.info(`Customer created: ${customer.createdAt}`);
    logger.info(`Package created: ${pkg.createdAt}`);
    logger.info(`Package validFrom: ${pkg.validFrom}`);
    logger.info(`Earliest session: ${earliestBooking.startTime}`);

    // Update all timestamps
    await usersCollection.updateOne(
      { _id: davidUser._id },
      { $set: { createdAt: newDate, updatedAt: newDate } }
    );

    await customersCollection.updateOne(
      { _id: customer._id },
      { $set: { createdAt: newDate, updatedAt: newDate } }
    );

    await packagesCollection.updateOne(
      { _id: pkg._id },
      { $set: { createdAt: newDate, updatedAt: newDate, validFrom: newDate } }
    );

    logger.info('\n=== AFTER FIX ===');
    logger.info(`All timestamps set to: ${newDate.toISOString()}`);
    logger.info(`Formatted: ${newDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok', dateStyle: 'full', timeStyle: 'long' })}`);

    // Verify
    const verifyUser = await usersCollection.findOne({ _id: davidUser._id });
    const verifyCustomer = await customersCollection.findOne({ _id: customer._id });
    const verifyPackage = await packagesCollection.findOne({ _id: pkg._id });

    logger.info('\n=== VERIFICATION ===');
    logger.info(`User created: ${new Date(verifyUser.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Customer created: ${new Date(verifyCustomer.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Package created: ${new Date(verifyPackage.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Package validFrom: ${new Date(verifyPackage.validFrom).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Earliest session: ${new Date(earliestBooking.startTime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);

    if (verifyUser.createdAt <= verifyPackage.validFrom && verifyPackage.validFrom <= earliestBooking.startTime) {
      logger.info('\n✅ Data consistency PASSED: Account ≤ Package ≤ Sessions');
    } else {
      logger.error('\n❌ Data consistency FAILED!');
    }

    await mongoose.disconnect();
    logger.info('\n✅ Fix completed successfully\n');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

fixDavidLeeConsistency();
