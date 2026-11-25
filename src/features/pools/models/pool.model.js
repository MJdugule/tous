import mongoose from 'mongoose';

const poolSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true }, 
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, uppercase: true, trim: true, default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    allocationLock: {
      token: { type: String, default: null },
      expiresAt: { type: Date, default: null }
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      default: 'upcoming',
      index: true,
    },
  },
  { timestamps: true }
);

poolSchema.index({ startsAt: 1 });

export default mongoose.model('Pool', poolSchema);