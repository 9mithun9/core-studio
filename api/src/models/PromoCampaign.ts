import mongoose, { Schema } from 'mongoose';
import { IPromoCampaign, PromoCampaignStatus } from '@/types';

const promoCampaignSchema = new Schema<IPromoCampaign>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageTemplate',
      required: true,
    },
    segmentFilter: {
      type: Schema.Types.Mixed,
      default: {},
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PromoCampaignStatus),
      default: PromoCampaignStatus.DRAFT,
    },
    stats: {
      sent: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
promoCampaignSchema.index({ scheduledFor: 1, status: 1 });

export const PromoCampaign = mongoose.model<IPromoCampaign>('PromoCampaign', promoCampaignSchema);
