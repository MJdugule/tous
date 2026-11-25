import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    poolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pool',
      required: true,
    },
    roomNumber: { type: Number, required: true },
    maleCount: { type: Number, default: 0, min: 0, max: 5 },
    femaleCount: { type: Number, default: 0, min: 0, max: 5 },
    status: {
      type: String,
      enum: ['open', 'started'],
      default: 'open',
    },
  },
  { timestamps: true }
);

// Prevents duplicate room numbers within the same pool
roomSchema.index({ poolId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ poolId: 1, status: 1 });

export default mongoose.model('Room', roomSchema);