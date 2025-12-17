import mongoose from 'mongoose';
import { User, Customer, Package } from '../src/models';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkDavidLeePackages() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Find David Lee user
    const davidUser = await User.findOne({ name: 'David Lee' }).lean();

    if (!davidUser) {
      logger.warn('David Lee not found in database');
      return;
    }

    logger.info('\n=== David Lee User Account ===');
    logger.info(`User ID: ${davidUser._id}`);
    logger.info(`Email: ${davidUser.email}`);
    logger.info(`Account Created At: ${new Date(davidUser.createdAt).toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
      dateStyle: 'full',
      timeStyle: 'long'
    })}`);

    // Find customer profile
    const customer = await Customer.findOne({ userId: davidUser._id }).lean();
    if (customer) {
      logger.info('\n=== David Lee Customer Profile ===');
      logger.info(`Customer ID: ${customer._id}`);
      logger.info(`Customer Created At: ${new Date(customer.createdAt).toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'full',
        timeStyle: 'long'
      })}`);

      // Find all packages
      const packages = await Package.find({ customerId: customer._id }).sort({ validFrom: 1 }).lean();

      logger.info('\n=== David Lee Packages ===');
      logger.info(`Total Packages: ${packages.length}`);

      packages.forEach((pkg: any, index: number) => {
        logger.info(`\n--- Package ${index + 1} ---`);
        logger.info(`Package ID: ${pkg._id}`);
        logger.info(`Name: ${pkg.name}`);
        logger.info(`Type: ${pkg.type}`);
        logger.info(`Status: ${pkg.status}`);
        logger.info(`Total Sessions: ${pkg.totalSessions}`);
        logger.info(`Remaining Sessions: ${pkg.remainingSessions}`);
        logger.info(`Valid From: ${pkg.validFrom} (${new Date(pkg.validFrom).toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'full',
          timeStyle: 'long'
        })})`);
        logger.info(`Valid To: ${pkg.validTo} (${new Date(pkg.validTo).toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'full',
          timeStyle: 'long'
        })})`);
        logger.info(`Package Created At: ${pkg.createdAt} (${new Date(pkg.createdAt).toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'full',
          timeStyle: 'long'
        })})`);
      });
    }

    await mongoose.disconnect();
    logger.info('\n\nDisconnected from MongoDB');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

checkDavidLeePackages();
