import cron from 'node-cron';
import { Booking } from '@/models';
import { BookingStatus } from '@/types';
import { logger } from '@/config/logger';

export class SchedulerService {
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) {
      logger.warn('Scheduler already initialized');
      return;
    }

    logger.info('Initializing scheduler service...');

    // Run every hour to auto-complete past sessions
    // Cron format: '0 * * * *' means "at minute 0 of every hour"
    cron.schedule('0 * * * *', async () => {
      await this.autoCompletePastSessions();
    });

    // Also run immediately on startup
    this.autoCompletePastSessions();

    this.isInitialized = true;
    logger.info('✅ Scheduler service initialized');
  }

  private static async autoCompletePastSessions() {
    try {
      const now = new Date();

      // Find all confirmed sessions that have ended
      const result = await Booking.updateMany(
        {
          endTime: { $lt: now },
          status: BookingStatus.CONFIRMED,
        },
        {
          $set: {
            status: BookingStatus.COMPLETED,
            attendanceMarkedAt: now,
          },
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`[Scheduler] Auto-completed ${result.modifiedCount} past session(s)`);
      }
    } catch (error) {
      logger.error('[Scheduler] Error auto-completing past sessions:', error);
    }
  }
}
