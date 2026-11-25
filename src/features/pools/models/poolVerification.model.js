import mongoose from 'mongoose';

const poolVerificationSchema = new mongoose.Schema(
  {
    poolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pool',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    selfieUrl: { type: String, required: true },
    hasPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ensures a user only needs to verify their selfie once per pool
poolVerificationSchema.index({ poolId: 1, userId: 1 }, { unique: true });

export default mongoose.model('PoolVerification', poolVerificationSchema);