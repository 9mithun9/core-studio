import { connectDB } from '@/config/db';
import { checkInactiveCustomers } from '@/services/inactiveCustomerScheduler';
import { logger } from '@/config/logger';

async function test() {
  try {
    logger.info('Testing inactive customer notifications...');

    // Connect to database
    await connectDB();

    // Run the check
    await checkInactiveCustomers();

    logger.info('Test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

test();
