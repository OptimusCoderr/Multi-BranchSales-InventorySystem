import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ISale extends Document {
  branchId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: 'cash' | 'pos' | 'unpaid';
  totalAmount: number;
  notes?: string;
  items: ISaleItem[];
  saleDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const saleSchema = new Schema<ISale>(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'pos', 'unpaid'],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    items: [saleItemSchema],
    saleDate: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISale>('Sale', saleSchema);
