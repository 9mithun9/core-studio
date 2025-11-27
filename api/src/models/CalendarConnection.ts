import mongoose, { Schema } from 'mongoose';
import { ICalendarConnection } from '@/types';

const calendarConnectionSchema = new Schema<ICalendarConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    googleAccountId: {
      type: String,
      required: true,
    },
    calendarId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
calendarConnectionSchema.index({ userId: 1 });
calendarConnectionSchema.index({ googleAccountId: 1 });

export const CalendarConnection = mongoose.model<ICalendarConnection>(
  'CalendarConnection',
  calendarConnectionSchema
);
