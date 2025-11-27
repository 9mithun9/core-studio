import mongoose, { Schema } from 'mongoose';
import { IPackage, PackageType, PackageStatus } from '@/types';

const packageSchema = new Schema<IPackage>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(PackageType),
      required: true,
    },
    totalSessions: {
      type: Number,
      required: true,
      min: 1,
    },
    remainingSessions: {
      type: Number,
      required: true,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'THB',
    },
    status: {
      type: String,
      enum: Object.values(PackageStatus),
      default: PackageStatus.ACTIVE,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
packageSchema.index({ customerId: 1 });
packageSchema.index({ status: 1 });
packageSchema.index({ validTo: 1 });
packageSchema.index({ customerId: 1, status: 1 });

export const Package = mongoose.model<IPackage>('Package', packageSchema);
