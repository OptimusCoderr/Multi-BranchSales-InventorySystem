import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  location: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
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

export default mongoose.model<IBranch>('Branch', branchSchema);
