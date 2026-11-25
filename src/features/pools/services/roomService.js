import poolHelper  from '../utilities/helpers/poolHelper.js';
import roomHelper from '../utilities/helpers/roomHelper.js';
const { toPoolListItemDto, toUserRoomDto } = require('../dto/pool.dto');
const AppError = require('../utilities/errors/AppError');

const joinWaitingRoom = async (poolId, user, socketId, selfieUrl) => {
  if (!user || !user.gender) {
    throw new AppError('User gender is required to join a room.', 400);
  }

  return poolHelper.assignUserToRoom({
    poolId,
    userId: user._id || user.id,
    gender: user.gender, // Taken directly from the user object
    socketId,
    selfieUrl,
  });
};

const assignUserToRoom = async ({ poolId, userId, gender, socketId, selfieUrl }) => {
  const pool = await poolHelper.findPoolById(poolId);
  if (!pool) throw new AppError('Pool not found.', 402);
  if (pool.status !== 'active') {
    throw new AppError('This pool is not active yet.', 400);
  }

  // 1. Check or save one-time selfie verification for this pool
  let verification = await poolHelper.findVerifiedRoomForUserInPool({ poolId, userId });
  if (!verification) {
    if (!selfieUrl) {
      throw new AppError('A current selfie is required before joining this pool.', 403);
    }
    if (pool.isPaid) {
      throw new AppError('Payment is required before joining this paid pool.', 402);
    }
    verification = await poolHelper.createPoolVerification({
      poolId,
      userId,
      selfieUrl,
      hasPaid: !pool.isPaid,
    });
  } else if (pool.isPaid && !verification.hasPaid) {
    throw new AppError('Please complete payment for this pool first.', 402);
  }

  // 2. Check if user is already in a room
  const existingMember = await roomHelper.findRoomMemberById(userId );
  if (existingMember && existingMember.roomId) {
    if (
      existingMember.roomId.status === 'started' &&
      existingMember.poolId.toString() === poolId.toString()
    ) {
      existingMember.socketId = socketId;
      await existingMember.save();
      return { room: existingMember.roomId, reconnectedToStarted: true };
    }
    throw new AppError('You are already waiting in a room.', 409);
  }

  const genderField = gender === 'male' ? 'maleCount' : 'femaleCount';
  const genderInc = gender === 'male' ? { maleCount: 1 } : { femaleCount: 1 };

  // 3. Atomically claim a seat in an existing 'open' room where gender count < 5
  let room = await Room.findOneAndUpdate(
    {
      poolId,
      status: 'open',
      [genderField]: { $lt: 5 },
    },
    { $inc: genderInc },
    { new: true, sort: { roomNumber: 1 } }
  );

  // 4. If no open room had space for this gender:
  if (!room) {
    const anyOpenRoom = await Room.findOne({ poolId, status: 'open' });
    if (anyOpenRoom) {
      throw new AppError(
        `Room #${anyOpenRoom.roomNumber} already has 5 ${gender}s. Waiting for opposite gender slots to fill.`
      );
    }

    // No open rooms exist -> create the next numbered room with this user as the 1st member
    const lastRoom = await Room.findOne({ poolId }).sort({ roomNumber: -1 });
    const nextRoomNumber = (lastRoom?.roomNumber || 0) + 1;

    try {
      room = await Room.create({
        poolId,
        roomNumber: nextRoomNumber,
        maleCount: gender === 'male' ? 1 : 0,
        femaleCount: gender === 'female' ? 1 : 0,
        status: 'open',
      });
    } catch (err) {
      // Handle rare concurrent creation collision (duplicate key error 11000) by retrying claim
      if (err.code === 11000) {
        room = await Room.findOneAndUpdate(
          { poolId, status: 'open', [genderField]: { $lt: 5 } },
          { $inc: genderInc },
          { new: true, sort: { roomNumber: 1 } }
        );
      }
      if (!room) throw err;
    }
  }

  // 5. Record active live WebSocket membership
  try {
    await roomHelper.createRoomMember({
      roomId: room._id,
      poolId,
      userId,
      socketId,
      userGender: gender,
    });
  } catch (err) {
    // Rollback seat increment if member creation fails
    await roomHelper.findByIdAndUpdate(room._id, {
      $inc: gender === 'male' ? { maleCount: -1 } : { femaleCount: -1 },
    });
    throw err;
  }

  // 6. If room just hit 5 males + 5 females, flip status to 'started'
  if (room.maleCount === 5 && room.femaleCount === 5 && room.status === 'open') {
    room = await roomHelper.findOneAndUpdate(
      { _id: room._id, status: 'open' },
      { $set: { status: 'started' } },
      { new: true }
    );
  }

  return { room, reconnectedToStarted: false };
};
