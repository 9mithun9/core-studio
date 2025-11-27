import cron from 'node-cron';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { sendNotifications } from './jobs/sendNotifications';
import { checkExpiredPackages } from './jobs/checkExpiredPackages';
import { createReminders } from './jobs/createReminders';
import { logger } from './config/logger';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pilates-studio';

async function startWorker() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Worker connected to MongoDB');

    // Schedule jobs

    // Send notifications every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      logger.info('Running job: Send Notifications');
      try {
        await sendNotifications();
      } catch (error) {
        logger.error('Error in sendNotifications job:', error);
      }
    });

    // Create reminders for upcoming sessions every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('Running job: Create Reminders');
      try {
        await createReminders();
      } catch (error) {
        logger.error('Error in createReminders job:', error);
      }
    });

    // Check for expired packages once a day at 1 AM
    cron.schedule('0 1 * * *', async () => {
      logger.info('Running job: Check Expired Packages');
      try {
        await checkExpiredPackages();
      } catch (error) {
        logger.error('Error in checkExpiredPackages job:', error);
      }
    });

    logger.info('Worker started successfully. Jobs scheduled.');
    logger.info('Schedule:');
    logger.info('  - Send Notifications: Every 5 minutes');
    logger.info('  - Create Reminders: Every hour');
    logger.info('  - Check Expired Packages: Daily at 1 AM');
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  logger.info('Worker shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Worker shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

startWorker();
