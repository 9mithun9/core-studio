import mongoose from 'mongoose';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixAllCustomersConsistency() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const customersCollection = db.collection('customers');
    const packagesCollection = db.collection('packages');
    const bookingsCollection = db.collection('bookings');

    // Get all customers
    const customers = await customersCollection.find({}).toArray();
    logger.info(`Processing ${customers.length} customers...\n`);

    let fixedCount = 0;

    for (const customer of customers) {
      const user = await usersCollection.findOne({ _id: customer.userId });
      if (!user) continue;

      const packages = await packagesCollection.find({ customerId: customer._id }).toArray();

      for (const pkg of packages) {
        const bookings = await bookingsCollection.find({ packageId: pkg._id }).sort({ startTime: 1 }).toArray();

        if (bookings.length > 0) {
          const earliestSession = new Date(bookings[0].startTime);

          // Set consistent base date: same as earliest session, at 9 AM
          const baseDate = new Date(earliestSession);
          baseDate.setHours(9, 0, 0, 0);

          // Calculate proper validTo: exactly 12 months from validFrom
          const properValidTo = new Date(baseDate);
          properValidTo.setFullYear(properValidTo.getFullYear() + 1);

          const updates = [];

          // Update user createdAt
          await usersCollection.updateOne(
            { _id: user._id },
            { $set: { createdAt: baseDate, updatedAt: baseDate } }
          );
          updates.push('user');

          // Update customer createdAt
          await customersCollection.updateOne(
            { _id: customer._id },
            { $set: { createdAt: baseDate, updatedAt: baseDate } }
          );
          updates.push('customer');

          // Update package createdAt, validFrom, and validTo
          await packagesCollection.updateOne(
            { _id: pkg._id },
            {
              $set: {
                createdAt: baseDate,
                updatedAt: baseDate,
                validFrom: baseDate,
                validTo: properValidTo
              }
            }
          );
          updates.push('package');

          fixedCount++;
          logger.info(`✓ Fixed ${user.name}: ${updates.join(', ')}`);
          logger.info(`  Base date: ${baseDate.toISOString().split('T')[0]}`);
          logger.info(`  Valid until: ${properValidTo.toISOString().split('T')[0]} (12 months)`);
        }
      }
    }

    logger.info(`\n✅ Fixed ${fixedCount} packages for data consistency\n`);

    // Verify the fixes
    logger.info('=== VERIFICATION ===\n');
    const verifyCustomers = await customersCollection.find({}).toArray();
    let allGood = true;

    for (const customer of verifyCustomers) {
      const user = await usersCollection.findOne({ _id: customer.userId });
      if (!user) continue;

      const packages = await packagesCollection.find({ customerId: customer._id }).toArray();

      for (const pkg of packages) {
        const bookings = await bookingsCollection.find({ packageId: pkg._id }).sort({ startTime: 1 }).toArray();

        if (bookings.length > 0) {
          const userCreated = new Date(user.createdAt);
          const packageValidFrom = new Date(pkg.validFrom);
          const packageValidTo = new Date(pkg.validTo);
          const earliestSession = new Date(bookings[0].startTime);

          // Check consistency
          const consistent = userCreated <= packageValidFrom && packageValidFrom <= earliestSession;

          // Check validity period (should be 12 months)
          const monthsDiff = (packageValidTo.getFullYear() - packageValidFrom.getFullYear()) * 12 +
                           (packageValidTo.getMonth() - packageValidFrom.getMonth());
          const validityOK = monthsDiff === 12;

          if (!consistent || !validityOK) {
            logger.error(`❌ ${user.name} still has issues!`);
            allGood = false;
          }
        }
      }
    }

    if (allGood) {
      logger.info('✅ All customers now have consistent data!\n');
    }

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

fixAllCustomersConsistency();
