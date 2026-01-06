import cron from 'node-cron';
import { Customer, Booking, Package, InAppNotification } from '@/models';
import { BookingStatus } from '@/types';
import { logger } from '@/config/logger';
import { NotificationService } from './notificationService';

/**
 * Check for customers who haven't had a session in the last 15 days
 * and send them a reminder notification (daily until they book)
 *
 * Also check for customers who have completed all sessions in their packages
 * and have no active package (daily reminder)
 */
async function checkInactiveCustomers() {
  try {
    logger.info('Starting inactive customer check...');

    // Get all active customers
    const customers = await Customer.find()
      .populate('userId', 'name email')
      .lean();

    const now = new Date();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);

    // Get start of today for checking if we already sent notification today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    let notificationsSent = 0;

    for (const customer of customers) {
      const userId = (customer as any).userId._id;

      // Check if customer has any active packages
      const activePackages = await Package.find({
        customerId: customer._id,
        isActive: true,
        remainingSessions: { $gt: 0 },
        expiryDate: { $gt: now },
      });

      const hasActivePackage = activePackages.length > 0;

      // Find the most recent completed or confirmed booking for this customer
      const recentBooking = await Booking.findOne({
        customerId: customer._id,
        status: { $in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED] },
      })
        .sort({ startTime: -1 })
        .lean();

      // Check if customer should receive notification for inactivity
      let shouldNotifyInactivity = false;
      let daysSinceLastSession = null;

      if (!recentBooking) {
        // Customer has never had a booking - notify them
        shouldNotifyInactivity = true;
      } else if (recentBooking.startTime < fifteenDaysAgo) {
        // Customer's last session was more than 15 days ago
        shouldNotifyInactivity = true;
        daysSinceLastSession = Math.floor((now.getTime() - new Date(recentBooking.startTime).getTime()) / (1000 * 60 * 60 * 24));
      }

      // Check if customer has completed all sessions and has no active package
      const shouldNotifyNoPackage = !hasActivePackage;

      // Send notification if either condition is met
      if (shouldNotifyInactivity || shouldNotifyNoPackage) {
        let message = '';

        if (!hasActivePackage) {
          // No active package - encourage them to purchase
          message = "You've completed all your sessions! Ready to continue your Pilates journey? Request a new package and keep up your amazing progress!";
        } else if (daysSinceLastSession !== null && daysSinceLastSession > 15) {
          // Has package but inactive
          message = `It's been ${daysSinceLastSession} days since your last session. You still have sessions remaining in your package. Book a session today and continue your Pilates journey!`;
        } else {
          // Default message
          message = "It's been a while since your last session. Ready to get back on track? Book a session today and continue your Pilates journey!";
        }

        // Send notification to customer
        await NotificationService.createNotification({
          userId,
          type: 'inactive_reminder',
          title: 'We Miss You!',
          message,
          titleKey: 'notificationTypes.inactive_reminder.title',
          messageKey: 'notificationTypes.inactive_reminder.message',
          data: {
            daysSinceLastSession,
            hasActivePackage,
          },
        });

        notificationsSent++;
        logger.info(`Sent inactive reminder to customer: ${(customer as any).userId.name} (Days inactive: ${daysSinceLastSession || 'N/A'}, Has package: ${hasActivePackage})`);
      }
    }

    logger.info(`Inactive customer check completed. Sent ${notificationsSent} notifications.`);
  } catch (error) {
    logger.error('Error checking inactive customers:', error);
  }
}

/**
 * Initialize cron job for inactive customer notifications
 */
export function initializeInactiveCustomerScheduler() {
  // Run every day at 9 AM
  // Cron format: minute hour day month day-of-week
  // 0 9 * * * means: At 09:00 every day
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running scheduled inactive customer check...');
    await checkInactiveCustomers();
  });

  logger.info('Inactive customer scheduler initialized. Will check daily at 9 AM.');
}

// Export function for manual trigger (useful for testing)
export { checkInactiveCustomers };
