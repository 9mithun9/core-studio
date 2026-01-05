import { Types } from 'mongoose';
import { InAppNotification } from '@/models';
import { logger } from '@/config/logger';

export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(params: {
    userId: Types.ObjectId;
    type: 'booking_cancelled' | 'cancellation_requested' | 'package_requested' | 'package_approved' | 'package_rejected' | 'booking_requested' | 'booking_approved' | 'booking_rejected' | 'registration_requested' | 'registration_approved' | 'registration_rejected' | 'inactive_reminder';
    title: string;
    message: string;
    titleKey?: string;
    messageKey?: string;
    data?: Record<string, any>;
    relatedId?: Types.ObjectId;
    relatedModel?: 'Booking' | 'Package' | 'PackageRequest' | 'RegistrationRequest';
  }) {
    try {
      const notification = await InAppNotification.create({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        titleKey: params.titleKey,
        messageKey: params.messageKey,
        data: params.data,
        relatedId: params.relatedId,
        relatedModel: params.relatedModel,
        isRead: false,
      });

      logger.info(`Notification created for user ${params.userId}: ${params.type}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Notify teacher about booking cancellation (>12h)
   */
  static async notifyTeacherOfCancellation(params: {
    teacherId: Types.ObjectId;
    customerName: string;
    bookingDate: Date;
    bookingId: Types.ObjectId;
    reason?: string;
  }) {
    const message = params.reason
      ? `${params.customerName} cancelled their booking on ${params.bookingDate.toLocaleDateString()}. Reason: ${params.reason}`
      : `${params.customerName} cancelled their booking on ${params.bookingDate.toLocaleDateString()}`;

    return this.createNotification({
      userId: params.teacherId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message,
      titleKey: 'notificationTypes.booking_cancelled.title',
      messageKey: params.reason ? 'notificationTypes.booking_cancelled.messageWithReason' : 'notificationTypes.booking_cancelled.message',
      data: {
        customerName: params.customerName,
        bookingDate: params.bookingDate.toLocaleDateString(),
        reason: params.reason,
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify teacher about cancellation request (6-12h)
   */
  static async notifyTeacherOfCancellationRequest(params: {
    teacherId: Types.ObjectId;
    customerName: string;
    bookingDate: Date;
    bookingId: Types.ObjectId;
    reason?: string;
  }) {
    const message = params.reason
      ? `${params.customerName} requested to cancel booking on ${params.bookingDate.toLocaleDateString()}. Reason: ${params.reason}`
      : `${params.customerName} requested to cancel booking on ${params.bookingDate.toLocaleDateString()}`;

    return this.createNotification({
      userId: params.teacherId,
      type: 'cancellation_requested',
      title: 'Cancellation Request',
      message,
      titleKey: 'notificationTypes.cancellation_requested.title',
      messageKey: params.reason ? 'notificationTypes.cancellation_requested.messageWithReason' : 'notificationTypes.cancellation_requested.message',
      data: {
        customerName: params.customerName,
        bookingDate: params.bookingDate.toLocaleDateString(),
        reason: params.reason,
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify admin about package request
   */
  static async notifyAdminOfPackageRequest(params: {
    adminId: Types.ObjectId;
    customerName: string;
    packageType: string;
    sessions: number;
    requestId: Types.ObjectId;
  }) {
    return this.createNotification({
      userId: params.adminId,
      type: 'package_requested',
      title: 'New Package Request',
      message: `${params.customerName} requested a ${params.packageType} package with ${params.sessions} sessions`,
      titleKey: 'notificationTypes.package_requested.title',
      messageKey: 'notificationTypes.package_requested.message',
      data: {
        customerName: params.customerName,
        packageType: params.packageType,
        sessions: params.sessions,
      },
      relatedId: params.requestId,
      relatedModel: 'PackageRequest',
    });
  }

  /**
   * Notify customer about package approval
   */
  static async notifyCustomerOfApproval(params: {
    customerId: Types.ObjectId;
    packageType: string;
    sessions: number;
    packageId: Types.ObjectId;
  }) {
    return this.createNotification({
      userId: params.customerId,
      type: 'package_approved',
      title: 'Package Request Approved',
      message: `Your ${params.packageType} package with ${params.sessions} sessions has been approved and activated!`,
      titleKey: 'notificationTypes.package_approved.title',
      messageKey: 'notificationTypes.package_approved.message',
      data: {
        packageType: params.packageType,
        sessions: params.sessions,
      },
      relatedId: params.packageId,
      relatedModel: 'Package',
    });
  }

  /**
   * Notify customer about package rejection
   */
  static async notifyCustomerOfRejection(params: {
    customerId: Types.ObjectId;
    reason?: string;
    requestId: Types.ObjectId;
  }) {
    const message = params.reason
      ? `Your package request was rejected. Reason: ${params.reason}`
      : 'Your package request was rejected. Please contact admin for more details.';

    return this.createNotification({
      userId: params.customerId,
      type: 'package_rejected',
      title: 'Package Request Rejected',
      message,
      titleKey: 'notificationTypes.package_rejected.title',
      messageKey: params.reason ? 'notificationTypes.package_rejected.messageWithReason' : 'notificationTypes.package_rejected.message',
      data: {
        reason: params.reason,
      },
      relatedId: params.requestId,
      relatedModel: 'PackageRequest',
    });
  }

  /**
   * Notify customer that their cancellation request was approved
   */
  static async notifyCustomerOfCancellationApproval(params: {
    customerId: Types.ObjectId;
    bookingDate: Date;
    bookingId: Types.ObjectId;
  }) {
    return this.createNotification({
      userId: params.customerId,
      type: 'booking_cancelled',
      title: 'Cancellation Request Approved',
      message: `Your cancellation request for the booking on ${params.bookingDate.toLocaleDateString()} has been approved`,
      titleKey: 'notificationTypes.booking_cancelled.approvalTitle',
      messageKey: 'notificationTypes.booking_cancelled.approvalMessage',
      data: {
        bookingDate: params.bookingDate.toLocaleDateString(),
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify customer that their cancellation request was rejected
   */
  static async notifyCustomerOfCancellationRejection(params: {
    customerId: Types.ObjectId;
    bookingDate: Date;
    bookingId: Types.ObjectId;
    reason?: string;
  }) {
    const message = params.reason
      ? `Your cancellation request for the booking on ${params.bookingDate.toLocaleDateString()} was rejected. Reason: ${params.reason}`
      : `Your cancellation request for the booking on ${params.bookingDate.toLocaleDateString()} was rejected. Please contact the teacher for more details.`;

    return this.createNotification({
      userId: params.customerId,
      type: 'cancellation_requested',
      title: 'Cancellation Request Rejected',
      message,
      titleKey: 'notificationTypes.cancellation_requested.rejectionTitle',
      messageKey: params.reason ? 'notificationTypes.cancellation_requested.rejectionMessageWithReason' : 'notificationTypes.cancellation_requested.rejectionMessage',
      data: {
        bookingDate: params.bookingDate.toLocaleDateString(),
        reason: params.reason,
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify teacher about new booking request
   */
  static async notifyTeacherOfBookingRequest(params: {
    teacherId: Types.ObjectId;
    customerName: string;
    bookingDate: Date;
    bookingType: string;
    bookingId: Types.ObjectId;
  }) {
    return this.createNotification({
      userId: params.teacherId,
      type: 'booking_requested',
      title: 'New Booking Request',
      message: `${params.customerName} requested a ${params.bookingType} session on ${params.bookingDate.toLocaleDateString()}`,
      titleKey: 'notificationTypes.booking_requested.title',
      messageKey: 'notificationTypes.booking_requested.message',
      data: {
        customerName: params.customerName,
        bookingType: params.bookingType,
        bookingDate: params.bookingDate.toLocaleDateString(),
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify customer that their booking request was approved
   */
  static async notifyCustomerOfBookingApproval(params: {
    customerId: Types.ObjectId;
    bookingDate: Date;
    bookingId: Types.ObjectId;
    teacherName: string;
  }) {
    return this.createNotification({
      userId: params.customerId,
      type: 'booking_approved',
      title: 'Booking Request Approved',
      message: `Your booking request for ${params.bookingDate.toLocaleDateString()} has been approved by ${params.teacherName}`,
      titleKey: 'notificationTypes.booking_approved.title',
      messageKey: 'notificationTypes.booking_approved.message',
      data: {
        bookingDate: params.bookingDate.toLocaleDateString(),
        teacherName: params.teacherName,
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify customer that their booking request was rejected
   */
  static async notifyCustomerOfBookingRejection(params: {
    customerId: Types.ObjectId;
    bookingDate: Date;
    bookingId: Types.ObjectId;
    reason?: string;
  }) {
    const message = params.reason
      ? `Your booking request for ${params.bookingDate.toLocaleDateString()} was rejected. Reason: ${params.reason}`
      : `Your booking request for ${params.bookingDate.toLocaleDateString()} was rejected. Please contact the teacher for more details.`;

    return this.createNotification({
      userId: params.customerId,
      type: 'booking_rejected',
      title: 'Booking Request Rejected',
      message,
      titleKey: 'notificationTypes.booking_rejected.title',
      messageKey: params.reason ? 'notificationTypes.booking_rejected.messageWithReason' : 'notificationTypes.booking_rejected.message',
      data: {
        bookingDate: params.bookingDate.toLocaleDateString(),
        reason: params.reason,
      },
      relatedId: params.bookingId,
      relatedModel: 'Booking',
    });
  }

  /**
   * Notify admin about new registration request
   */
  static async notifyAdminOfRegistration(params: {
    adminId: Types.ObjectId;
    customerName: string;
    customerEmail: string;
    registrationId: Types.ObjectId;
  }) {
    return this.createNotification({
      userId: params.adminId,
      type: 'registration_requested',
      title: 'New Registration Request',
      message: `${params.customerName} (${params.customerEmail}) submitted a registration request`,
      titleKey: 'notificationTypes.registration_requested.title',
      messageKey: 'notificationTypes.registration_requested.message',
      data: {
        customerName: params.customerName,
        customerEmail: params.customerEmail,
      },
      relatedId: params.registrationId,
      relatedModel: 'RegistrationRequest',
    });
  }

  /**
   * Notify customer that their registration was approved
   */
  static async notifyCustomerOfRegistrationApproval(params: {
    customerId: Types.ObjectId;
    packageName: string;
    totalSessions: number;
  }) {
    return this.createNotification({
      userId: params.customerId,
      type: 'registration_approved',
      title: 'Registration Approved - Welcome!',
      message: `Welcome! Your registration has been approved and you've been assigned a ${params.packageName} package with ${params.totalSessions} sessions. Start booking your classes now!`,
      titleKey: 'notificationTypes.registration_approved.title',
      messageKey: 'notificationTypes.registration_approved.message',
      data: {
        packageName: params.packageName,
        totalSessions: params.totalSessions,
      },
    });
  }

  /**
   * Notify customer that their registration was rejected
   */
  static async notifyCustomerOfRegistrationRejection(params: {
    customerEmail: string;
    reason?: string;
  }) {
    // Note: Customer doesn't have userId yet, so this would need to be handled differently
    // For now, we'll just log it or send email
    logger.info(`Registration rejected for ${params.customerEmail}. Reason: ${params.reason || 'Not specified'}`);
    // TODO: Implement email notification for rejected registrations
  }

  /**
   * Notify customer about booking cancellation (e.g., teacher deactivated)
   */
  static async notifyBookingCancellation(params: {
    customerId: Types.ObjectId;
    customerName: string;
    teacherName: string;
    sessionDate: Date;
    reason?: string;
  }) {
    return this.createNotification({
      userId: params.customerId,
      type: 'booking_cancelled',
      title: 'Session Cancelled',
      message: `Your session with ${params.teacherName} on ${params.sessionDate.toLocaleDateString()} has been cancelled. ${params.reason || ''}`,
      titleKey: 'notificationTypes.booking_cancelled.teacherDeactivatedTitle',
      messageKey: 'notificationTypes.booking_cancelled.teacherDeactivatedMessage',
      data: {
        teacherName: params.teacherName,
        bookingDate: params.sessionDate.toLocaleDateString(),
        reason: params.reason,
      },
      relatedModel: 'Booking'
    });
  }
}
