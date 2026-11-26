import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { PoolError } from '../utilities/errors/poolError.js';
import * as roomHelper from '../utilities/helpers/roomHelper.js';
import PoolVerification from '../models/poolVerification.model.js';
import RoomMember from '../models/roomMember.model.js';
// import poolHelper from '../utilities/helpers/poolHelper.js';
import * as poolHelper from '../utilities/helpers/poolHelper.js';
// import * as poolHelper from '../utilities/helpers/poolHelper.js';

const ROOM_SIZE = 10;
const GENDER_ROOM_CAPACITY = 5;

/** @typedef {import('../dtos/pool.dto.js').CreatePoolDTO} CreatePoolDTO */

const objectIdOrThrow = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new PoolError('Pool not found.', 404);
  }
};

const getPoolOrThrow = async (id) => {
  objectIdOrThrow(id);
  const pool = await poolHelper.findPoolById(id);

  if (!pool) {
    throw new PoolError('Pool not found.');
  }

  return pool;
};

const getPoolStatus = (pool) => (pool.startsAt > new Date() ? 'upcoming' : 'active');



const roomDTO = (room) => ({
  id: room.id,
  poolId: room.poolId?.id ?? room.poolId?.toString(),
  roomNumber: room.roomNumber,
  status: room.status,
  totalUsers: room.members.length,
  availableSlots: {
    male: GENDER_ROOM_CAPACITY - room.maleCount,
    female: GENDER_ROOM_CAPACITY - room.femaleCount
  },
  members: room.members.map(({ userId, gender, joinedAt }) => ({
    user: userId && typeof userId === 'object'
      ? { id: userId.id, fullName: userId.fullName, gender: userId.gender ?? gender }
      : { id: userId.toString(), gender },
    joinedAt
  }))
});

const assertNotStarted = (pool) => {
  if (pool.startsAt <= new Date()) {
    throw new PoolError('This pool has already started and is no longer accepting members.', 409);
  }
};

const assertPaid = async (pool, userId) => {
  if (pool.type !== 'paid') {
    return;
  }

  const payment = await poolHelper.findConfirmedPayment(pool.id, userId);
  if (!payment) {
    throw new PoolError('Payment must be confirmed before joining this paid pool.', 402);
  }
};

export class PoolService {
  /**
   * @param {CreatePoolDTO} payload
   * @param {string} ownerId
   */
  async createPool(payload, ownerId) {
    if (payload.type === 'free' && (payload.priceMinorUnits ?? 0) !== 0) {
      throw new PoolError('Free pools cannot have a price.');
    }

    const pool = await poolHelper.createPool({
      ...payload,
      price: payload.isPaid ? payload.price : 0,
      status: new Date(payload.scheduledAt) <= new Date() ? 'active' : 'upcoming',
      ownerId
    });

    // await poolHelper.populatePoolOwner(pool);
    return  pool.populate('ownerId', 'name avatarUrl')
  }

  async getAvailablePools(userId) {
  const activeMembership = await roomHelper.findRoomMemberById(userId );
  const excludePoolIds = activeMembership ? [activeMembership.poolId] : [];

  
  const pools = await poolHelper.fetchAvailablePools(excludePoolIds);
  return Promise.all(
    pools.map(async (pool) => {
      const [openRoom, totalUsersInPool, verification] = await Promise.all([
        roomHelper.getRoomByPoolId({ poolId: pool.id, status: 'open' }),
        roomHelper.getRoomMemberLengthByID(pool.id),
        poolHelper.findVerifiedRoomForUserInPool(pool.id, userId ),
      ]);

      return {
        pool,
        openRoom,
        totalUsersInPool,
        hasVerifiedSelfie: Boolean(verification),
      };
    })
  );
};

async registerForPool({ poolId, userId, selfieUrl = null }) {
  const pool = await poolHelper.findPoolById(poolId);
  if (!pool) throw new PoolError('Pool not found.', 400);
  if (pool.status === 'completed') {
    throw new PoolError('This pool has already ended.', 400);
  }

  // Check if user already has a confirmed registration
  const existing = await poolHelper.findVerifiedRoomForUserInPool({ poolId, userId });
  if (existing && (existing.paymentStatus === 'free' || existing.paymentStatus === 'paid')) {
    return {
      requiresPayment: false,
      verification: existing,
    };
  }

  // CASE A: Free Pool -> Confirm immediately
  if (!pool.isPaid) {
    const verification = await poolHelper.findPoolAndUpdate(
      poolId, userId, {
          paymentStatus: 'free',
          amountPaid: 0,
          ...(selfieUrl ? { selfieUrl } : {}),
        },
    );

    return {
      requiresPayment: false,
      verification,
    };
  }

  // CASE B: Paid Pool -> Mark as 'pending' and return payment reference for checkout
  const reference = `POOL_${poolId}_${userId}_${Date.now()}`;

  const verification = await poolHelper.findPoolAndUpdate(
    poolId, userId,
    {
      $set: {
        paymentStatus: 'pending',
        paymentReference: reference,
        ...(selfieUrl ? { selfieUrl } : {}),
      },
    },
  );

  return {
    requiresPayment: true,
    paymentReference: reference,
    amount: pool.price,
    currency: pool.currency || 'NGN',
    verification,
  };
};

 async fetchMyRegisteredPools(userId){
  const records = await PoolVerification.find({
    userId,
    paymentStatus: { $in: ['free', 'paid'] },
  })
    .populate({
      path: 'poolId',
      match: { status: { $in: ['upcoming', 'active'] } },
      populate: { path: 'ownerId', select: 'name avatarUrl' },
    })
    .sort({ createdAt: -1 });

  const activeRecords = records.filter((r) => r.poolId !== null);

  return Promise.all(
    activeRecords.map(async (ver) => {
      const pool = ver.poolId;
      const [totalRegistered, activeMember] = await Promise.all([
        PoolVerification.countDocuments({
          poolId: pool._id,
          paymentStatus: { $in: ['free', 'paid'] },
        }),
        RoomMember.findOne({ poolId: pool._id, userId }).populate('roomId'),
      ]);

      return {
        verificationId: ver._id,
        paymentStatus: ver.paymentStatus,
        registeredAt: ver.createdAt,
        hasVerifiedSelfie: Boolean(ver.selfieUrl),
        canEnterWaitingRoom: pool.status === 'active',
        pool: {
          id: pool._id,
          title: pool.title,
          description: pool.description,
          imageUrl: pool.imageUrl,
          startsAt: pool.startsAt,
          status: pool.status,
          isPaid: pool.isPaid,
          price: pool.price,
          currency: pool.currency || 'NGN',
          totalRegisteredUsers: totalRegistered,
          owner: pool.ownerId,
        },
        currentRoom: activeMember?.roomId
          ? {
              roomId: activeMember.roomId._id,
              roomNumber: activeMember.roomId.roomNumber,
              status: activeMember.roomId.status,
              maleCount: activeMember.roomId.maleCount,
              femaleCount: activeMember.roomId.femaleCount,
            }
          : null,
      };
    })
  );
};

  async joinPool(poolId, user) {
    // objectIdOrThrow(poolId);
    const poolDetails = await poolHelper.findPoolById(poolId);

    if (poolDetails == null) {
      throw new PoolError('Pool not found.');
    }
    if (user.gender == null) {
      throw new PoolError('Complete your profile before joining a Pool.');
    }

    let pool = await getPoolOrThrow(poolId);
    assertNotStarted(pool);
    await assertPaid(pool, user._id);

    const lockToken = await poolHelper.acquireRoomAllocationLock(pool._id);
    if (!lockToken) {
      throw new PoolError('Room allocation is busy. Please try joining again.', 409);
    }
    try {
      pool = await poolHelper.findPoolById(poolId);
      if (!pool) {
        throw new PoolError('Pool not found.', 404);
      }
      assertNotStarted(pool);
      await assertPaid(pool, user._id);

      const existingRoom = await poolHelper.findRoomForUserInPool(pool._id, user._id);
      if (existingRoom) {
        throw new PoolError('You have already joined a room in this pool.', 409);
      }

      let room = await poolHelper.findLatestRoomInPool(pool._id);
      const genderCountField = user.gender === 'male' ? 'maleCount' : 'femaleCount';

      if (room && room.status === 'open' && room[genderCountField] >= GENDER_ROOM_CAPACITY) {
        throw new PoolError('The current room has no remaining slot for your gender.', 409);
      }

      if (!room || room.status === 'full') {
        room = await poolHelper.createRoom({
          poolId: pool._id,
          roomNumber: room ? room.roomNumber + 1 : 1,
          members: [],
          maleCount: 0,
          femaleCount: 0,
          status: 'open'
        });
      }

      room.members.push({ userId: user._id, gender: user.gender });
      room[genderCountField] += 1;
      if (room.maleCount === GENDER_ROOM_CAPACITY && room.femaleCount === GENDER_ROOM_CAPACITY) {
        room.status = 'full';
      }
      await poolHelper.saveRoom(room);
      await poolHelper.populateRoomMembers(room);

      const totalUsers = await poolHelper.countRoomMembers(pool._id);

      return {
        room: roomDTO(room),
        poolTotalUsers: totalUsers
      };
    } catch (error) {
      if (error?.code === 11000) {
        throw new PoolError('You have already joined a room in this pool.', 409);
      }
      throw error;
    } finally {
      await poolHelper.releaseRoomAllocationLock(pool._id, lockToken);
    }
  }
}
