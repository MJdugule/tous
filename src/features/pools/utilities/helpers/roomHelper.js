import Pool from '../../models/pool.model.js';
import PoolVerification from '../../models/poolVerification.model.js';
import Room from '../../models/room.model.js';
import RoomMember from '../../models/roomMember.model.js';
// import AppError from '../errors/AppError';

const upsertPoolSelfie = async (poolId, userId, selfieUrl) => {
  return PoolVerification.findOneAndUpdate(
    { poolId, userId },
    { $set: { selfieUrl } },
    { upsert: true, new: true }
  );
};

export const createRoomMember = async (data) => RoomMember.create(data);

export const findOneAndUpdate = async (data) => Room.findOneAndUpdate(data);


export const findByIdAndUpdate = async (data) => Room.findByIdAndUpdate(data);


export const findRoomMemberById = async (userId) =>
  RoomMember.findOne({ userId }).populate('roomId');

export const getRoomByPoolId = async (data) =>
  Room.findOne(data).sort({ roomNumber: 1 });

export const getRoomMemberLengthByID = async (poolID) =>
  RoomMember.countDocuments({ poolId: poolID});

// export const findRoomMemberById = async (userId) =>
//   RoomMember.findOne({ userId }).populate('roomId');

/**
 * Atomically claims a gender seat (5M + 5F) in an open room,
 * or creates a new room if no open room exists in the pool.
 */
const assignUserToRoom = async ({ poolId, userId, gender, socketId, selfieUrl }) => {
  const pool = await Pool.findById(poolId);
  if (!pool) throw new AppError('Pool not found.', 404);
  if (pool.status !== 'active') {
    throw new AppError('This pool is not active yet.', 400);
  }

  // 1. Check or save one-time selfie verification for this pool
  let verification = await PoolVerification.findOne({ poolId, userId });
  if (!verification) {
    if (!selfieUrl) {
      throw new AppError('A current selfie is required before joining this pool.', 403);
    }
    if (pool.isPaid) {
      throw new AppError('Payment is required before joining this paid pool.', 402);
    }
    verification = await PoolVerification.create({
      poolId,
      userId,
      selfieUrl,
      hasPaid: !pool.isPaid,
    });
  } else if (pool.isPaid && !verification.hasPaid) {
    throw new AppError('Please complete payment for this pool first.', 402);
  }

  // 2. Check if user is already in a room
  const existingMember = await RoomMember.findOne({ userId }).populate('roomId');
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
    await RoomMember.create({
      roomId: room._id,
      poolId,
      userId,
      socketId,
      userGender: gender,
    });
  } catch (err) {
    // Rollback seat increment if member creation fails
    await Room.findByIdAndUpdate(room._id, {
      $inc: gender === 'male' ? { maleCount: -1 } : { femaleCount: -1 },
    });
    throw err;
  }

  // 6. If room just hit 5 males + 5 females, flip status to 'started'
  if (room.maleCount === 5 && room.femaleCount === 5 && room.status === 'open') {
    room = await Room.findOneAndUpdate(
      { _id: room._id, status: 'open' },
      { $set: { status: 'started' } },
      { new: true }
    );
  }

  return { room, reconnectedToStarted: false };
};

/**
 * Removes disconnected user from an 'open' waiting room and frees their gender slot.
 */
const removeUserFromWaitingRoom = async (socketId) => {
  const member = await RoomMember.findOne({ socketId }).populate('roomId');
  if (!member || !member.roomId || member.roomId.status !== 'open') {
    return null;
  }

  await RoomMember.deleteOne({ _id: member._id });

  const decField = member.userGender === 'male' ? { maleCount: -1 } : { femaleCount: -1 };
  const updatedRoom = await Room.findOneAndUpdate(
    { _id: member.roomId._id, status: 'open' },
    { $inc: decField },
    { new: true }
  );

  return updatedRoom;
};

// const fetchUserRooms = async (userId) => {
//   const memberships = await RoomMember.find({ userId })
//     .populate('roomId')
//     .populate({
//       path: 'poolId',
//       populate: { path: 'ownerId', select: 'name avatarUrl' },
//     });

//   return Promise.all(
//     memberships.map(async (m) => {
//       const totalUsersInPool = await RoomMember.countDocuments({ poolId: m.poolId._id });
//       return { membership: m, totalUsersInPool };
//     })
//   );
// };

const fetchAvailablePools = async (excludePoolIds) => {
  return await Pool.find({
    _id: { $nin: excludePoolIds },
    status: { $in: ['upcoming', 'active'] },
  })
    .populate('ownerId', 'name avatarUrl')
    .sort({ scheduledAt: 1 });
};