import mongoose, { Schema, Document } from 'mongoose';

export interface IBranchStock extends Document {
  branchId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const branchStockSchema = new Schema<IBranchStock>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Create compound unique index
branchStockSchema.index({ branchId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IBranchStock>('BranchStock', branchStockSchema);
