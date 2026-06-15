import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff';
  branchId?: mongoose.Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    fullName: { type: String, required: [true, 'Full name is required'], trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Pre-save hook ─────────────────────────────────────────────────────────────
// Mongoose 8+ async pre-hooks: throw instead of calling next(err),
// return early instead of calling next() to skip.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(
    this.password,
    parseInt(process.env.BCRYPT_ROUNDS || '12')
  );
});

// ── Instance method ───────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // `this.password` is normally excluded by `select: false`; it is present here
  // because auth routes explicitly do `.select('+password')` before calling this.
  return bcrypt.compare(candidatePassword, this.password as string);
};

export default mongoose.model<IUser>('User', userSchema);
