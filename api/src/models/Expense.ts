import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  _id: Types.ObjectId;
  reportId: Types.ObjectId; // Link to PaymentReport
  month: number;
  year: number;
  category: 'rent' | 'instruments' | 'electricity' | 'water' | 'others';
  amount: number;
  description: string;
  createdBy: Types.ObjectId; // Admin who created it
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    reportId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentReport',
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ['rent', 'instruments', 'electricity', 'water', 'others'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
expenseSchema.index({ year: 1, month: 1 });
expenseSchema.index({ reportId: 1 });
expenseSchema.index({ category: 1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
