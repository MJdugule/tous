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
    selfieUrl: {
      type: String,
      default: null, // Optional at 8:00 AM registration; required before entering the live room at 10:00 PM
    },
    paymentStatus: {
      type: String,
      enum: ['free', 'pending', 'paid'],
      default: 'free',
    },
    paymentReference: {
      type: String,
      default: null,
      index: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One verification/registration record per user per pool
poolVerificationSchema.index({ poolId: 1, userId: 1 }, { unique: true });

export default mongoose.model('PoolVerification', poolVerificationSchema);