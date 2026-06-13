import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouseStock extends Document {
  warehouseId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const warehouseStockSchema = new Schema<IWarehouseStock>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
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

warehouseStockSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });

export default mongoose.model<IWarehouseStock>('WarehouseStock', warehouseStockSchema);
