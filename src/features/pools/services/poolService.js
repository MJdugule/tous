import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { PoolError } from '../utilities/errors/poolError.js';
import * as roomHelper from '../utilities/helpers/roomHelper.js';
import PoolVerification from '../models/poolVerification.model.js';
import RoomMember from '../models/roomMember.model.js';
// import poolHelper from '../utilities/helpers/poolHelper.js';
import * as poolHelper from '../utilities/helpers/poolHelper.js';
// import * as poolHelper from '../utilities/helpers/poolHelper.js';
import * as dbHelper from '../../auth/utilities/helpers/authHelper.js';
// import * as poolHelper from '../utilities/helpers/poolHelper.js';

const ROOM_SIZE = 10;
const GENDER_ROOM_CAPACITY = 5;

/** @typedef {import('../dtos/pool.dto.js').CreatePoolDTO} CreatePoolDTO */

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
    return pool.populate('ownerId', 'name avatarUrl')
  }

  async getAvailablePools(userId) {
    const activeMembership = await roomHelper.findRoomMemberById(userId);
    const excludePoolIds = activeMembership ? [activeMembership.poolId] : [];


    const pools = await poolHelper.fetchAvailablePools(excludePoolIds);
    return Promise.all(
      pools.map(async (pool) => {
        const [openRoom, totalUsersInPool, verification] = await Promise.all([
          roomHelper.getRoomByPoolId({ poolId: pool.id, status: 'open' }),
          roomHelper.getRoomMemberLengthByID(pool.id),
          poolHelper.findVerifiedRoomForUserInPool(pool.id, userId),
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

  async registerForPool(poolId, userId, selfieUrl = null) {
    const user = await dbHelper.findUserById(userId);

    if (!user.gender) {
      throw new PoolError('Update your profile to register for a pool', 400);
    }
    if (!pool) throw new PoolError('Pool not found.', 400);
    const pool = await poolHelper.findPoolById(poolId);
    if (!pool) throw new PoolError('Pool not found.', 400);
    if (pool.status === 'completed') {
      throw new PoolError('This pool has already ended.', 400);
    }

    // Check if user already has a confirmed registration
    const existing = await poolHelper.findVerifiedRoomForUserInPool(poolId, userId);
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
        // verification,
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

  async fetchMyRegisteredPools(userId) {
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

  async joinWaitingRoom(poolId, user, socketId, selfieUrl) {
    if (!user || !user.gender) {
      throw new PoolError('User gender is required to join a room.', 400);
    }

    return poolHelper.assignUserToRoom({
      poolId,
      userId: user._id || user.id,
      gender: user.gender, // Taken directly from the user object
      socketId,
      selfieUrl,
    });
  }
};
