/**
 * POST-SEED DATA CONSISTENCY SCRIPT
 *
 * Run this after seeding to ensure all customer accounts have consistent historical dates:
 * - User createdAt = earliest package validFrom
 * - Customer createdAt = earliest package validFrom
 * - Package createdAt = package validFrom
 * - Package validTo = validFrom + 12 months
 * - All timestamps <= earliest session date
 *
 * Usage: npm run dev:ensure-consistency or npx tsx scripts/ensureDataConsistency.ts
 */

import mongoose from 'mongoose';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function ensureDataConsistency() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB\n');
    logger.info('🔍 Checking all customers for data consistency...\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const customersCollection = db.collection('customers');
    const packagesCollection = db.collection('packages');
    const bookingsCollection = db.collection('bookings');

    // Get all customers
    const customers = await customersCollection.find({}).toArray();
    logger.info(`Found ${customers.length} customers to process\n`);

    let fixedCount = 0;
    let alreadyConsistent = 0;

    for (const customer of customers) {
      const user = await usersCollection.findOne({ _id: customer.userId });
      if (!user || user.role !== 'customer') continue;

      // Get all packages for this customer
      const packages = await packagesCollection.find({ customerId: customer._id }).sort({ createdAt: 1 }).toArray();
      if (packages.length === 0) continue;

      // Find the earliest session across all packages
      let earliestSessionDate: Date | null = null;

      for (const pkg of packages) {
        const bookings = await bookingsCollection.find({ packageId: pkg._id }).sort({ startTime: 1 }).toArray();
        if (bookings.length > 0) {
          const sessionDate = new Date(bookings[0].startTime);
          if (!earliestSessionDate || sessionDate < earliestSessionDate) {
            earliestSessionDate = sessionDate;
          }
        }
      }

      if (!earliestSessionDate) continue;

      // Set base date: same as earliest session, at 9 AM
      const baseDate = new Date(earliestSessionDate);
      baseDate.setHours(9, 0, 0, 0);

      // Check if already consistent
      const userDate = new Date(user.createdAt);
      const isConsistent = Math.abs(userDate.getTime() - baseDate.getTime()) < 86400000; // Within 1 day

      if (isConsistent) {
        alreadyConsistent++;
        logger.info(`✓ ${user.name}: Already consistent`);
        continue;
      }

      // Fix user and customer timestamps
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { createdAt: baseDate, updatedAt: baseDate } }
      );

      await customersCollection.updateOne(
        { _id: customer._id },
        { $set: { createdAt: baseDate, updatedAt: baseDate } }
      );

      // Fix each package
      for (const pkg of packages) {
        const pkgValidFrom = new Date(pkg.validFrom);
        const pkgBaseDate = new Date(pkgValidFrom);
        pkgBaseDate.setHours(9, 0, 0, 0);

        // Calculate proper validTo: exactly 12 months from validFrom
        const properValidTo = new Date(pkgBaseDate);
        properValidTo.setFullYear(properValidTo.getFullYear() + 1);

        await packagesCollection.updateOne(
          { _id: pkg._id },
          {
            $set: {
              createdAt: pkgBaseDate,
              updatedAt: pkgBaseDate,
              validFrom: pkgBaseDate,
              validTo: properValidTo
            }
          }
        );
      }

      fixedCount++;
      logger.info(`✓ Fixed ${user.name}: Set account date to ${baseDate.toISOString().split('T')[0]}`);
    }

    logger.info(`\n📊 Summary:`);
    logger.info(`   ✅ Already consistent: ${alreadyConsistent}`);
    logger.info(`   🔧 Fixed: ${fixedCount}`);
    logger.info(`   📦 Total: ${customers.length}\n`);

    if (fixedCount > 0) {
      logger.info('✅ Data consistency ensured!\n');
    } else {
      logger.info('✅ All data was already consistent!\n');
    }

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

ensureDataConsistency();
