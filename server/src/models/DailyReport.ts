import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyReport extends Document {
  branchId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  reportDate: Date;
  totalCash: number;
  totalPos: number;
  totalUnpaid: number;
  totalAmount: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  saleIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const dailyReportSchema = new Schema<IDailyReport>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    totalCash: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPos: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUnpaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    saleIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Sale',
      },
    ],
  },
  { timestamps: true }
);

// Create compound index for uniqueness per branch and date
dailyReportSchema.index({ branchId: 1, reportDate: 1 }, { unique: true });

export default mongoose.model<IDailyReport>('DailyReport', dailyReportSchema);
