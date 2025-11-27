import mongoose, { Schema } from 'mongoose';
import { ICustomer } from '@/types';

const customerSchema = new Schema<ICustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
    },
    healthNotes: {
      type: String,
      trim: true,
    },
    preferredTeacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    emergencyContactName: {
      type: String,
      trim: true,
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
customerSchema.index({ userId: 1 });
customerSchema.index({ tags: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
