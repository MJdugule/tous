import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountMinorUnits: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, uppercase: true },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
    providerTransactionId: { type: String, unique: true, sparse: true },
    confirmedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

paymentSchema.index({ poolId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Payment', paymentSchema);
