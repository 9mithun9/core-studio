import mongoose, { Schema } from 'mongoose';
import { ISessionReview } from '@/types';

const sessionReviewSchema = new Schema<ISessionReview>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    ratings: {
      control: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      postureAlignment: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      strength: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      flexibilityMobility: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      bodyAwarenessFocus: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
sessionReviewSchema.index({ bookingId: 1 });
sessionReviewSchema.index({ customerId: 1 });
sessionReviewSchema.index({ teacherId: 1 });

export const SessionReview = mongoose.model<ISessionReview>('SessionReview', sessionReviewSchema);
