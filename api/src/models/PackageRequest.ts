import mongoose, { Schema, Document } from 'mongoose';

export interface IPackageRequest extends Document {
  customerId: mongoose.Types.ObjectId;
  packageType: 'private' | 'duo' | 'group';
  sessions: number;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  notes?: string;
}

const packageRequestSchema = new Schema<IPackageRequest>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    packageType: {
      type: String,
      enum: ['private', 'duo', 'group'],
      required: true,
    },
    sessions: {
      type: Number,
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
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

export const PackageRequest = mongoose.model<IPackageRequest>('PackageRequest', packageRequestSchema);
