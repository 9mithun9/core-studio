import mongoose from 'mongoose';
import { Customer, Package } from '../src/models';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function fixCustomerCreationDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Get all customers
    const customers = await Customer.find();
    logger.info(`Found ${customers.length} customers to process`);

    for (const customer of customers) {
      // Find the first package for this customer (oldest by createdAt)
      const firstPackage = await Package.findOne({ customerId: customer._id })
        .sort({ createdAt: 1 })
        .lean();

      if (!firstPackage) {
        logger.warn(`No packages found for customer ${customer._id}`);
        continue;
      }

      const firstPackageDate = firstPackage.createdAt;

      // Update customer's createdAt to match first package date
      // Use direct collection update to bypass Mongoose timestamp immutability
      await Customer.collection.updateOne(
        { _id: customer._id },
        {
          $set: {
            createdAt: firstPackageDate,
            updatedAt: firstPackageDate,
          },
        }
      );

      logger.info(
        `Updated customer ${customer._id}: createdAt set to ${firstPackageDate.toISOString()}`
      );
    }

    logger.info('✅ Successfully updated all customer creation dates');
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing customer creation dates:', error);
    process.exit(1);
  }
}

fixCustomerCreationDates();
