import mongoose, { Schema } from 'mongoose';
import { IUser, UserRole, UserStatus } from '@/types';

const userSchema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.CUSTOMER,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    lineUserId: {
      type: String,
      default: null,
      sparse: true, // Allows multiple null values
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ lineUserId: 1 }, { sparse: true });

export const User = mongoose.model<IUser>('User', userSchema);
