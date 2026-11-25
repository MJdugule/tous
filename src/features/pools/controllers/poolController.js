import { PoolError } from '../utilities/errors/poolError.js';
import { PoolService } from '../services/poolService.js';

const poolService = new PoolService();

const sendError = (res, error, fallback, context) => {
  if (error instanceof PoolError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  console.error(`[Pool Controller] ${context}:`, error);
  return res.status(500).json({ success: false, message: fallback });
};

export class PoolController {
  async createPool(req, res) {
    try {
      const data = await poolService.createPool(req.body, req.user.id);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to create pool.', 'Create pool failed');
    }
  }

  async submitSelfie(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const { poolId } = req.params;
    const { selfieUrl } = req.body;

    const verification = await poolService.verifySelfieForPool(poolId, userId, selfieUrl);
    res.status(200).json({ success: true, data: verification });
  } catch (err) {
    return sendError(res, error, 'Unable to create pool.', 'Create pool failed');
  }


  }


 async getAvailablePools(req, res, next) {
  try {
    const userId = req.user.id;
    const pools = await poolService.getAvailablePools(userId);
    res.status(200).json({ success: true, data: pools });
  } catch (error) {
   return sendError(res, error, 'Unable to create pool.', 'Create pool failed');
  }
};

  async listPools(req, res) {
    try {
      const data = await poolService.listPools(req.query.status);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to load pools.', 'List pools failed');
    }
  }

  async getPoolRooms(req, res) {
    try {
      const data = await poolService.getPoolRooms(req.params.poolId, req.user.id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to load pool rooms.', 'Get pool rooms failed');
    }
  }

  async getMyRooms(req, res) {
    try {
      const data = await poolService.getMyRooms(req.user.id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to load your rooms.', 'Get user rooms failed');
    }
  }

  async updateGender(req, res) {
    try {
      const data = await poolService.updateGender(req.user.id, req.body.gender);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to update gender.', 'Update gender failed');
    }
  }

  async joinPool(req, res) {
    try {
      const data = await poolService.joinPool(req.body.poolId, req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to join pool.', 'Join pool failed');
    }
  }

  async createPaymentIntent(req, res) {
    try {
      const data = await poolService.createPaymentIntent(req.params.poolId, req.user.id);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to create payment intent.', 'Create payment intent failed');
    }
  }

  async paymentWebhook(req, res) {
    try {
      const data = await poolService.processPaymentWebhook(
        req.get('x-payment-signature'),
        req.body,
        req.rawBody
      );
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return sendError(res, error, 'Unable to process payment webhook.', 'Payment webhook failed');
    }
  }
}
