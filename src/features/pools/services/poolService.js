import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import { PoolError } from '../utilities/errors/poolError.js';
import * as roomHelper from '../utilities/helpers/roomHelper.js';
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
  const activeMembership = await roomHelper.findRoomMemberById({ userId });
  const excludePoolIds = activeMembership ? [activeMembership.poolId] : [];

  const pools = await poolHelper.fetchAvailablePools(excludePoolIds);

  return Promise.all(
    pools.map(async (pool) => {
      const [openRoom, totalUsersInPool, verification] = await Promise.all([
        roomHelper.getRoomByPoolId({ poolId: pool._id, status: 'open' }),
        roomHelper.getRoomMemberLengthByID(pool._id),
        poolHelper.findVerifiedRoomForUserInPool({ poolId: pool._id, userId }).select('_id'),
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

  async listPools(status) {
    const now = new Date();
    const filter = status === 'upcoming'
      ? { startsAt: { $gt: now } }
      : status === 'active'
        ? { startsAt: { $lte: now } }
        : {};
    const pools = await poolHelper.findPools(filter);
    const countRows = await poolHelper.countRoomMembersByPool(pools.map(({ _id }) => _id));
    const counts = new Map(countRows.map(({ _id, totalUsers }) => [_id.toString(), totalUsers]));

    return pools.map((pool) => poolDTO(pool, counts.get(pool.id) ?? 0));
  }

  async getPoolRooms(poolId, userId) {
    const pool = await getPoolOrThrow(poolId);
    const rooms = await poolHelper.findRoomsByPool(pool._id);
    const userRoom = rooms.find((room) =>
      room.members.some((member) => member.userId?.id === userId.toString())
    );
    const user = await poolHelper.findUserGender(userId);
    const availableRooms = rooms
      .filter((room) =>
        room.status === 'open' &&
        ['male', 'female'].includes(user?.gender) &&
        room[`${user.gender}Count`] < GENDER_ROOM_CAPACITY
      )
      .map(roomDTO);

    return {
      pool: poolDTO(pool, rooms.reduce((sum, room) => sum + room.members.length, 0)),
      myRoom: userRoom ? roomDTO(userRoom) : null,
      availableRooms
    };
  }

  async getMyRooms(userId) {
    const rooms = await poolHelper.findRoomsByUser(userId);

    return rooms.map((room) => ({
      ...roomDTO(room),
      pool: room.poolId ? poolDTO(room.poolId) : null
    }));
  }

  async updateGender(userId, gender) {
    const membership = await poolHelper.findUserRoomMembership(userId);
    if (membership) {
      throw new PoolError('Gender cannot be changed after joining a room.', 409);
    }

    const user = await poolHelper.updateUserGender(userId, gender);
    if (!user) {
      throw new PoolError('User not found.', 404);
    }

    return { gender: user.gender };
  }

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
