import mongoose, { Schema } from 'mongoose';
import { IPayment, PaymentMethod } from '@/types';

const paymentSchema = new Schema<IPayment>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'THB',
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    paidAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    referenceCode: {
      type: String,
      trim: true,
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
paymentSchema.index({ paidAt: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ packageId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
