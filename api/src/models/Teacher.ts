import mongoose, { Schema } from 'mongoose';
import { ITeacher } from '@/types';

const teacherSchema = new Schema<ITeacher>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    specialties: {
      type: [String],
      default: [],
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    hourlyRate: {
      type: Number,
      min: 0,
    },
    defaultLocation: {
      type: String,
      trim: true,
    },
    workingHoursTemplate: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    teacherType: {
      type: String,
      enum: ['freelance', 'studio'],
      default: 'freelance',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teacherSchema.index({ userId: 1 });
teacherSchema.index({ isActive: 1 });

export const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);
