import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  previousPrice: number;
  currentPrice: number;
  unit: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    previousPrice: {
      type: Number,
      default: 0,
      min: [0, 'Previous price cannot be negative'],
    },
    currentPrice: {
      type: Number,
      required: true,
      min: [0, 'Current price cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      enum: ['piece', 'kg', 'litre', 'box', 'carton', 'bag', 'roll', 'pair', 'set', 'dozen'],
      default: 'piece',
    },
    category: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>('Product', productSchema);
