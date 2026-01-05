import mongoose, { Schema } from 'mongoose';
import { IPaymentReport } from '@/types';

const paymentReportSchema = new Schema<IPaymentReport>(
  {
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
    reportType: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
    },
    teacherPayments: [
      {
        teacherId: {
          type: Schema.Types.ObjectId,
          ref: 'Teacher',
          required: true,
        },
        teacherName: {
          type: String,
          required: true,
        },
        teacherType: {
          type: String,
          enum: ['freelance', 'studio'],
          required: true,
        },
        sessions: {
          private: {
            count: { type: Number, default: 0 },
            commission: { type: Number, default: 0 },
          },
          duo: {
            count: { type: Number, default: 0 },
            commission: { type: Number, default: 0 },
          },
          group: {
            count: { type: Number, default: 0 },
            commission: { type: Number, default: 0 },
          },
        },
        totalSessions: {
          type: Number,
          default: 0,
        },
        totalCommission: {
          type: Number,
          default: 0,
        },
        baseSalary: {
          type: Number,
          default: 0,
        },
        bonuses: [
          {
            bonusId: {
              type: Schema.Types.ObjectId,
              ref: 'Bonus',
            },
            amount: { type: Number, default: 0 },
            reason: { type: String, default: '' },
            type: {
              type: String,
              enum: ['one-time', 'recurring'],
            },
          },
        ],
        totalBonuses: {
          type: Number,
          default: 0,
        },
        totalPayment: {
          type: Number,
          default: 0,
        },
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    // Expenses
    expenses: [
      {
        expenseId: {
          type: Schema.Types.ObjectId,
          ref: 'Expense',
        },
        category: {
          type: String,
          enum: ['rent', 'instruments', 'electricity', 'water', 'others'],
        },
        amount: { type: Number, default: 0 },
        description: { type: String, default: '' },
      },
    ],
    totalExpenses: {
      type: Number,
      default: 0,
    },
    // Profit/Loss Calculation
    totalTeacherPayments: {
      type: Number,
      default: 0,
    },
    totalCosts: {
      type: Number,
      default: 0, // totalTeacherPayments + totalExpenses
    },
    profitLoss: {
      type: Number,
      default: 0, // totalRevenue - totalCosts
    },
    // Packages Sold
    packagesSold: [
      {
        packageId: {
          type: Schema.Types.ObjectId,
          ref: 'Package',
        },
        customerId: {
          type: Schema.Types.ObjectId,
          ref: 'Customer',
        },
        customerName: { type: String, default: '' },
        packageName: { type: String, default: '' },
        packageType: { type: String, default: '' },
        totalSessions: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        purchaseDate: { type: Date },
      },
    ],
    totalPackagesSold: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentReportSchema.index({ year: 1, month: 1, reportType: 1 });
paymentReportSchema.index({ startDate: 1, endDate: 1 });
paymentReportSchema.index({ generatedAt: -1 });

export const PaymentReport = mongoose.model<IPaymentReport>('PaymentReport', paymentReportSchema);
