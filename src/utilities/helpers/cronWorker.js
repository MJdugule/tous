import Pool from '../../features/pools/models/pool.model.js';

// How long a pool stays 'active' after startsAt before auto-completing (e.g., 2 hours)
const POOL_DURATION_MS = 2 * 60 * 60 * 1000;

export const syncPoolStatuses = async (io = null) => {
  try {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() - POOL_DURATION_MS);

    // 1. Find upcoming pools whose start time has arrived
    const poolsToActivate = await Pool.find({
      status: 'upcoming',
      startsAt: { $lte: now },
    }).select('_id title');

    if (poolsToActivate.length > 0) {
      const ids = poolsToActivate.map((p) => p._id);

      await Pool.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'active' } }
      );

      // Optional: Notify connected clients in real time that these pools are now live
      if (io) {
        poolsToActivate.forEach((pool) => {
          io.emit('pool:activated', {
            poolId: pool._id,
            title: pool.title,
            status: 'active',
          });
        });
      }

      console.log(`✅ Activated ${poolsToActivate.length} pool(s)`);
    }

    // 2. Flip active pools past their duration to 'completed'
    // (If your Pool model has an `endsAt` field, replace `startsAt: { $lte: expiryThreshold }` with `endsAt: { $lte: now }`)
    const completedRes = await Pool.updateMany(
      {
        status: 'active',
        startsAt: { $lte: expiryThreshold },
      },
      {
        $set: { status: 'completed' },
      }
    );

    if (completedRes.modifiedCount > 0) {
      console.log(`🏁 Completed ${completedRes.modifiedCount} expired pool(s)`);
    }
  } catch (error) {
    console.error('❌ Pool status scheduler error:', error.message);
  }
};

export const startPoolScheduler = (io, intervalMs = 30 * 1000) => {
  // Run immediately once on server startup so stale pools update right away
  syncPoolStatuses(io);

  // Then run every 30 seconds
  const timer = setInterval(() => syncPoolStatuses(io), intervalMs);

  // Allow Node.js to exit cleanly if shutting down
  timer.unref();
  return timer;
};