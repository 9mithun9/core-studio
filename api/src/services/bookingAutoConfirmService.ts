import { Booking, Customer, Teacher, Notification } from '@/models';
import { BookingStatus, NotificationType, NotificationChannel } from '@/types';
import { logger } from '@/config/logger';
import { NotificationService } from './notificationService';

/**
 * Auto-confirm pending booking requests that are older than 12 hours
 * This ensures customers get timely responses even if teachers forget to approve
 */
export class BookingAutoConfirmService {
  private static readonly AUTO_CONFIRM_HOURS = 12;

  /**
   * Process all pending bookings and auto-confirm those older than 12 hours
   */
  static async processAutoConfirmations(): Promise<void> {
    try {
      logger.info('🔍 Checking for pending bookings to auto-confirm...');

      // Calculate cutoff time (12 hours ago)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - this.AUTO_CONFIRM_HOURS);

      // Find all pending bookings created more than 12 hours ago
      const pendingBookings = await Booking.find({
        status: BookingStatus.PENDING,
        isRequestedByCustomer: true,
        requestCreatedAt: { $lte: cutoffTime },
      })
        .populate('customerId')
        .populate('teacherId')
        .populate('packageId');

      if (pendingBookings.length === 0) {
        logger.info('✓ No pending bookings to auto-confirm');
        return;
      }

      logger.info(`📋 Found ${pendingBookings.length} pending booking(s) to auto-confirm`);

      let confirmedCount = 0;

      for (const booking of pendingBookings) {
        try {
          // Update booking status to confirmed
          booking.status = BookingStatus.CONFIRMED;
          booking.confirmedAt = new Date();
          booking.autoConfirmed = true;
          booking.notes = booking.notes
            ? `${booking.notes}\n[Auto-confirmed after 12 hours - teacher did not respond]`
            : '[Auto-confirmed after 12 hours - teacher did not respond]';

          await booking.save();

          // Send notification to customer
          if (booking.customerId) {
            const customer = booking.customerId as any;
            const teacher = booking.teacherId as any;

            await NotificationService.createNotification({
              userId: customer.userId,
              type: 'booking_approved' as any,
              titleKey: 'notifications.bookingAutoConfirmed.title',
              messageKey: 'notifications.bookingAutoConfirmed.message',
              data: {
                teacherName: teacher?.userId?.name || 'teacher',
                autoConfirmed: true
              },
              relatedId: booking._id,
              relatedModel: 'Booking'
            });

            logger.info(`✓ Auto-confirmed booking ${booking._id} for customer ${customer.userId?.name}`);
          }

          // Send notification to teacher (they missed the request)
          if (booking.teacherId) {
            const teacher = booking.teacherId as any;
            const customer = booking.customerId as any;

            await NotificationService.createNotification({
              userId: teacher.userId,
              type: 'booking_approved' as any,
              titleKey: 'notifications.bookingAutoConfirmedTeacher.title',
              messageKey: 'notifications.bookingAutoConfirmedTeacher.message',
              data: {
                customerName: customer?.userId?.name || 'customer',
                autoConfirmed: true
              },
              relatedId: booking._id,
              relatedModel: 'Booking'
            });
          }

          confirmedCount++;
        } catch (error) {
          logger.error(`Error auto-confirming booking ${booking._id}:`, error);
        }
      }

      logger.info(`✅ Auto-confirmed ${confirmedCount} booking(s)`);
    } catch (error) {
      logger.error('Error in auto-confirm service:', error);
    }
  }

  /**
   * Start the auto-confirm service with periodic checks
   * Runs every hour to check for bookings to auto-confirm
   */
  static startPeriodicCheck(): NodeJS.Timeout {
    logger.info('🚀 Starting booking auto-confirm service (checks every hour)');

    // Run immediately on start
    this.processAutoConfirmations();

    // Then run every hour
    const intervalId = setInterval(() => {
      this.processAutoConfirmations();
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    return intervalId;
  }
}
