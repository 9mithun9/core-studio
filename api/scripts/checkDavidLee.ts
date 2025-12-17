import mongoose from 'mongoose';
import { User, Customer } from '../src/models';
import { logger } from '../src/config/logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function checkDavidLee() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Find David Lee user
    const davidUser = await User.findOne({ name: 'David Lee' }).lean();

    if (davidUser) {
      logger.info('\n=== David Lee User Account ===');
      logger.info(`User ID: ${davidUser._id}`);
      logger.info(`Email: ${davidUser.email}`);
      logger.info(`Created At: ${davidUser.createdAt}`);
      logger.info(`Created At (formatted): ${new Date(davidUser.createdAt).toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'full',
        timeStyle: 'long'
      })}`);

      // Find customer profile
      const customer = await Customer.findOne({ userId: davidUser._id }).lean();
      if (customer) {
        logger.info('\n=== David Lee Customer Profile ===');
        logger.info(`Customer ID: ${customer._id}`);
        logger.info(`Created At: ${customer.createdAt}`);
        logger.info(`Created At (formatted): ${new Date(customer.createdAt).toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'full',
          timeStyle: 'long'
        })}`);
      }
    } else {
      logger.warn('David Lee not found in database');
    }

    await mongoose.disconnect();
    logger.info('\nDisconnected from MongoDB');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

checkDavidLee();
