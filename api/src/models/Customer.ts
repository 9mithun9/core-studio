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
    height: {
      type: Number, // in cm
    },
    weight: {
      type: Number, // in kg
    },
    medicalNotes: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
    },
    profession: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      trim: true,
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
    totalCancellations: {
      type: Number,
      default: 0,
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
