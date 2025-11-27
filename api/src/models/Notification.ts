import mongoose, { Schema } from 'mongoose';
import { INotification, NotificationChannel, NotificationType, NotificationStatus } from '@/types';

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.SCHEDULED,
    },
    sentAt: {
      type: Date,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ userId: 1 });
notificationSchema.index({ bookingId: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
