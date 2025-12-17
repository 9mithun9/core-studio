import { Types } from 'mongoose';
import { InAppNotification } from '@/models';
import { logger } from '@/config/logger';

export class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification(params: {
    userId: Types.ObjectId;
    type: 'booking_cancelled' | 'cancellation_requested' | 'package_requested' | 'package_approved' | 'package_rejected' | 'booking_requested' | 'booking_approved' | 'booking_rejected' | 'registration_requested' | 'registration_approved' | 'registration_rejected';
    title: string;
    message: string;
    relatedId?: Types.ObjectId;
    relatedModel?: 'Booking' | 'Package' | 'PackageRequest' | 'RegistrationRequest';
  }) {
    try {
      const notification = await InAppNotification.create({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
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
}
