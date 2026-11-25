import mongoose from 'mongoose';

const roomMemberSchema = new mongoose.Schema(
    {
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: true,
            index: true,
        },
        poolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Pool',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // A user can only be active in one room at a time
        },
        socketId: {
            type: String,
            required: true,
            unique: true, // Used to auto-remove user on WebSocket disconnect
        },
        userGender: {
            type: String,
            enum: ['male', 'female'],
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('RoomMember', roomMemberSchema);
