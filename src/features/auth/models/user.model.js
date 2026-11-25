import mongoose from 'mongoose';

const userModel = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true, lowercase: true },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    role: { type: String, required: true, trim: true, default: "USER" },
  },
  { timestamps: true }
);

export default mongoose.model('User', userModel);
