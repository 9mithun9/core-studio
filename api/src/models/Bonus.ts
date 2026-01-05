import mongoose, { Schema } from 'mongoose';
import { IBonus } from '@/types';

const bonusSchema = new Schema<IBonus>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['one-time', 'recurring'],
      default: 'one-time',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'approved',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
bonusSchema.index({ teacherId: 1, month: 1, year: 1 });
bonusSchema.index({ status: 1 });
bonusSchema.index({ type: 1 });

export const Bonus = mongoose.model<IBonus>('Bonus', bonusSchema);
