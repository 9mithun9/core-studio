import mongoose, { Schema } from 'mongoose';
import { IBooking, BookingStatus, PackageType } from '@/types';

const bookingSchema = new Schema<IBooking>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
    },
    type: {
      type: String,
      enum: Object.values(PackageType),
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },
    isRequestedByCustomer: {
      type: Boolean,
      default: false,
    },
    requestCreatedAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    confirmedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    googleCalendarEventId: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    attendanceMarkedAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ teacherId: 1, startTime: 1 });
bookingSchema.index({ customerId: 1, startTime: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startTime: 1 });
bookingSchema.index({ status: 1, startTime: 1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
