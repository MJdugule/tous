import { randomUUID } from 'node:crypto';
import Payment from '../../models/payment.model.js';
import Pool from '../../models/pool.model.js';
import Room from '../../models/room.model.js';
import User from '../../../auth/models/user.model.js';
import PoolVerification from '../../models/poolVerification.model.js';
import RoomMember from '../../models/roomMember.model.js';

const ROOM_LOCK_LIFETIME_MS = 30_000;

export const createPool = async (data) => Pool.create(data);

const upsertPoolSelfie = async (poolId, userId, selfieUrl) => {
  return PoolVerification.findOneAndUpdate(
    { poolId, userId },
    { $set: { selfieUrl } },
    { upsert: true, new: true }
  );
};

export const populatePoolOwner = async (pool) =>
  pool.populate('ownerId', 'fullName');

export const findPoolById = async (id) => {
  const query = Pool.findById(id);
  return query;
};

export const findPools = async (filter) =>
  Pool.find(filter).populate('ownerId', 'fullName').sort({ startsAt: 1 });

export const countRoomMembersByPool = async (poolIds) => {
  if (poolIds.length === 0) {
    return [];
  }

  return Room.aggregate([
    { $match: { poolId: { $in: poolIds } } },
    { $unwind: '$members' },
    { $group: { _id: '$poolId', totalUsers: { $sum: 1 } } }
  ]);
};

export const countRoomMembers = async (poolId) => {
  const [result] = await Room.aggregate([
    { $match: { poolId } },
    { $unwind: '$members' },
    { $count: 'totalUsers' }
  ]);

  return result?.totalUsers ?? 0;
};

export const findRoomsByPool = async (poolId) =>
  Room.find({ poolId })
    .populate('members.userId', 'fullName gender')
    .sort({ roomNumber: 1 });

export const findRoomsByUser = async (userId) =>
  Room.find({ 'members.userId': userId })
    .populate({ path: 'poolId', populate: { path: 'ownerId', select: 'fullName' } })
    .populate('members.userId', 'fullName gender')
    .sort({ createdAt: -1 });

export const findVerifiedRoomForUserInPool = async (poolId, userId) =>
  PoolVerification.findOne({ poolId, userId });

export const createPoolVerification = async (data) => PoolVerification.create(data);


export const findRoomForUserInPool = async (poolId, userId) =>
  Room.findOne({ poolId, 'members.userId': userId });

export const findLatestRoomInPool = async (poolId) =>
  Room.findOne({ poolId }).sort({ roomNumber: -1 });

export const createRoom = async (data) => new Room(data);

export const saveRoom = async (room) => room.save();

export const populateRoomMembers = async (room) =>
  room.populate('members.userId', 'fullName gender');

export const acquireRoomAllocationLock = async (poolId) => {
  const token = randomUUID();

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const now = new Date();
    const pool = await Pool.findOneAndUpdate(
      {
        _id: poolId,
        $or: [
          { 'allocationLock.token': null },
          { 'allocationLock.expiresAt': { $lte: now } }
        ]
      },
      {
        $set: {
          'allocationLock.token': token,
          'allocationLock.expiresAt': new Date(now.getTime() + ROOM_LOCK_LIFETIME_MS)
        }
      },
      { new: true }
    );

    if (pool) {
      return token;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
};

export const releaseRoomAllocationLock = async (poolId, token) =>
  Pool.updateOne(
    { _id: poolId, 'allocationLock.token': token },
    { $set: { 'allocationLock.token': null, 'allocationLock.expiresAt': null } }
  );

export const findUserById = async (id) => User.findById(id);

export const findUserGender = async (id) => User.findById(id).select('gender');

export const findUserRoomMembership = async (userId) =>
  Room.exists({ 'members.userId': userId });

export const updateUserGender = async (userId, gender) =>
  User.findByIdAndUpdate(userId, { $set: { gender } }, { new: true });

export const findConfirmedPayment = async (poolId, userId) =>
  Payment.exists({ poolId, userId, status: 'confirmed' });

export const findPaymentForPoolAndUser = async (poolId, userId) =>
  Payment.findOne({ poolId, userId });

export const createPayment = async (data) => Payment.create(data);

export const updatePayment = async (id, update) =>
  Payment.findByIdAndUpdate(id, update, { new: true, runValidators: true });

export const findPaymentByReference = async (reference) =>
  Payment.findOne({ reference });

export const savePayment = async (payment) => payment.save();
