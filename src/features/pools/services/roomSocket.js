import { PoolService } from '../services/poolService.js';
import { validateSocketJoinRoomSchema } from '../utilities/validators/poolValidators.js';

export const registerRoomHandlers = (io, socket) => {
  // Assumes your Socket.io auth middleware attached `socket.data.user`
  const user = socket.data.user;

  socket.on('room:join', async (rawPayload) => {
    try {
      const { error, value } = validateSocketJoinRoomSchema.validate(rawPayload);
      if (error) {
        return socket.emit('room:error', { message: error.details[0].message });
      }

      const { poolId, selfieUrl } = value;
      const { room, reconnectedToStarted } = await PoolService.joinWaitingRoom(
        poolId,
        user,
        socket.id,
        selfieUrl
      );

      const roomChannel = `room:${room._id}`;
      await socket.join(roomChannel);

      if (reconnectedToStarted) {
        return socket.emit('room:started', {
          roomId: room._id,
          roomNumber: room.roomNumber,
        });
      }

      // Broadcast updated waiting room counts to everyone inside
      io.to(roomChannel).emit('room:waiting_update', {
        roomId: room._id,
        roomNumber: room.roomNumber,
        status: room.status,
        maleCount: room.maleCount,
        femaleCount: room.femaleCount,
        totalUsers: room.maleCount + room.femaleCount,
      });

      // Trigger start of conversation once 5 males + 5 females are present
      if (room.status === 'started') {
        io.to(roomChannel).emit('room:started', {
          roomId: room._id,
          roomNumber: room.roomNumber,
          message: 'Room is full (5 males & 5 females). Starting conversation now!',
        });
      }
    } catch (err) {
      socket.emit('room:error', { message: err.message || 'Unable to join room' });
    }
  });

  const onLeaveOrDisconnect = async () => {
    try {
      const updatedRoom = await PoolService.handleDisconnect(socket.id);
      if (updatedRoom) {
        io.to(`room:${updatedRoom._id}`).emit('room:waiting_update', {
          roomId: updatedRoom._id,
          roomNumber: updatedRoom.roomNumber,
          status: updatedRoom.status,
          maleCount: updatedRoom.maleCount,
          femaleCount: updatedRoom.femaleCount,
          totalUsers: updatedRoom.maleCount + updatedRoom.femaleCount,
        });
      }
    } catch (err) {
      console.error('Error handling room disconnect:', err);
    }
  };

  socket.on('room:leave', onLeaveOrDisconnect);
  socket.on('disconnect', onLeaveOrDisconnect);
};

