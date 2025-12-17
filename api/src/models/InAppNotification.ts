import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInAppNotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // User who will receive the notification
  type: 'booking_cancelled' | 'cancellation_requested' | 'package_requested' | 'package_approved' | 'package_rejected' | 'booking_requested' | 'booking_approved' | 'booking_rejected' | 'registration_requested' | 'registration_approved' | 'registration_rejected';
  title: string;
  message: string;
  relatedId?: Types.ObjectId; // ID of related booking/package/request
  relatedModel?: 'Booking' | 'Package' | 'PackageRequest' | 'RegistrationRequest';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inAppNotificationSchema = new Schema<IInAppNotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['booking_cancelled', 'cancellation_requested', 'package_requested', 'package_approved', 'package_rejected', 'booking_requested', 'booking_approved', 'booking_rejected', 'registration_requested', 'registration_approved', 'registration_rejected'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    relatedModel: {
      type: String,
      enum: ['Booking', 'Package', 'PackageRequest', 'RegistrationRequest'],
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
inAppNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const InAppNotification = mongoose.model<IInAppNotification>('InAppNotification', inAppNotificationSchema);
