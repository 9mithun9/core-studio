import mongoose from 'mongoose';
import { User, Customer, Package, Booking } from '../src/models';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixDavidLeeData() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Find David Lee
    const davidUser = await User.findOne({ name: 'David Lee' }).lean();
    if (!davidUser) {
      logger.warn('David Lee not found');
      return;
    }

    const customer = await Customer.findOne({ userId: davidUser._id }).lean();
    if (!customer) {
      logger.warn('David Lee customer profile not found');
      return;
    }

    // Find David's package
    const pkg = await Package.findOne({ customerId: customer._id }).lean();
    if (!pkg) {
      logger.warn('David Lee package not found');
      return;
    }

    // Find all bookings for this package
    const bookings = await Booking.find({ packageId: pkg._id }).sort({ startTime: 1 }).lean();

    logger.info('\n=== BEFORE FIX ===');
    logger.info(`Account Created: ${new Date(davidUser.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Package Created: ${new Date(pkg.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Package Valid From: ${new Date(pkg.validFrom).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Earliest Session: ${bookings.length > 0 ? new Date(bookings[0].startTime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }) : 'N/A'}`);

    if (bookings.length === 0) {
      logger.warn('No bookings found for David Lee');
      return;
    }

    // Get the earliest session date
    const earliestSessionDate = new Date(bookings[0].startTime);

    // Set package validFrom to be earlier than the earliest session (start of that day)
    const newValidFrom = new Date(earliestSessionDate);
    newValidFrom.setHours(9, 0, 0, 0); // 9 AM on the same day as earliest session

    // Update customer createdAt to match earliest session date
    const newCustomerCreatedAt = new Date(earliestSessionDate);
    newCustomerCreatedAt.setHours(9, 0, 0, 0);

    // Update user createdAt to match
    const newUserCreatedAt = new Date(earliestSessionDate);
    newUserCreatedAt.setHours(9, 0, 0, 0);

    // Update package createdAt to match validFrom
    const newPackageCreatedAt = new Date(newValidFrom);

    logger.info('\n=== APPLYING FIXES ===');

    // Update user
    await User.updateOne(
      { _id: davidUser._id },
      { $set: { createdAt: newUserCreatedAt } }
    );
    logger.info(`✓ Updated user createdAt to ${newUserCreatedAt.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);

    // Update customer
    await Customer.updateOne(
      { _id: customer._id },
      { $set: { createdAt: newCustomerCreatedAt } }
    );
    logger.info(`✓ Updated customer createdAt to ${newCustomerCreatedAt.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);

    // Update package
    await Package.updateOne(
      { _id: pkg._id },
      {
        $set: {
          validFrom: newValidFrom,
          createdAt: newPackageCreatedAt
        }
      }
    );
    logger.info(`✓ Updated package validFrom to ${newValidFrom.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`✓ Updated package createdAt to ${newPackageCreatedAt.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);

    // Verify the fix
    const updatedUser = await User.findById(davidUser._id).lean();
    const updatedCustomer = await Customer.findById(customer._id).lean();
    const updatedPackage = await Package.findById(pkg._id).lean();
    const updatedBookings = await Booking.find({ packageId: pkg._id }).sort({ startTime: 1 }).lean();

    logger.info('\n=== AFTER FIX ===');
    logger.info(`Account Created: ${new Date(updatedUser!.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Package Created: ${new Date(updatedPackage!.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Package Valid From: ${new Date(updatedPackage!.validFrom).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);
    logger.info(`Earliest Session: ${new Date(updatedBookings[0].startTime).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`);

    logger.info('\n=== VERIFICATION ===');
    const accountDate = new Date(updatedUser!.createdAt);
    const packageDate = new Date(updatedPackage!.validFrom);
    const sessionDate = new Date(updatedBookings[0].startTime);

    if (accountDate <= packageDate && packageDate <= sessionDate) {
      logger.info('✅ Data consistency PASSED: Account ≤ Package ≤ Sessions');
    } else {
      logger.error('❌ Data consistency FAILED!');
    }

    await mongoose.disconnect();
    logger.info('\nDisconnected from MongoDB');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

fixDavidLeeData();
