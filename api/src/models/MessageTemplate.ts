import mongoose, { Schema } from 'mongoose';
import { IMessageTemplate, NotificationChannel } from '@/types';

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    variables: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageTemplateSchema.index({ key: 1, channel: 1 });

export const MessageTemplate = mongoose.model<IMessageTemplate>('MessageTemplate', messageTemplateSchema);
