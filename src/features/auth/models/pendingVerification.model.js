import mongoose from 'mongoose';

const pendingVerificationModel = new mongoose.Schema(
  {
    type: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    gender: { type: String, enum: ['male', 'female'], default: null },
    // passwordHash: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model('PendingVerification', pendingVerificationModel);
