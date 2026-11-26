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
  };

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
  };

  async getAvailablePools(req, res, next) {
    try {
      const userId = req.user.id;
      const pools = await poolService.getAvailablePools(userId);
      res.status(200).json({ success: true, data: pools });
    } catch (error) {
      return sendError(res, error, 'Unable to get pools.', 'Create pool failed');
    }
  };

  async registerPool(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const { poolId } = req.params;
      const { selfieUrl } = req.body; // Optional at 8am; can also be sent later

      const registration = await poolService.registerForPool(poolId, userId, selfieUrl);
      res.status(200).json({
        success: true,
        message: 'Successfully registered for pool',
        data: registration,
      });
    } catch (err) {
      next(err);
    }
  };

  async getMyRegisteredPools(req, res, next) {
    try {
      const userId = req.user._id || req.user.id;
      const list = await poolService.fetchMyRegisteredPools(userId);
      res.status(200).json({ success: true, data: list });
    } catch (err) {
      next(err);
    }
  };



  // async getMyRooms(req, res) {
  //   try {
  //     const data = await poolService.getMyRooms(req.user.id);
  //     return res.status(200).json({ success: true, data });
  //   } catch (error) {
  //     return sendError(res, error, 'Unable to load your rooms.', 'Get user rooms failed');
  //   }
  // }

  // async updateGender(req, res) {
  //   try {
  //     const data = await poolService.updateGender(req.user.id, req.body.gender);
  //     return res.status(200).json({ success: true, data });
  //   } catch (error) {
  //     return sendError(res, error, 'Unable to update gender.', 'Update gender failed');
  //   }
  // }

  // async joinPool(req, res) {
  //   try {
  //     const data = await poolService.joinPool(req.body.poolId, req.user);
  //     return res.status(200).json({ success: true, data });
  //   } catch (error) {
  //     return sendError(res, error, 'Unable to join pool.', 'Join pool failed');
  //   }
  // }

  // async createPaymentIntent(req, res) {
  //   try {
  //     const data = await poolService.createPaymentIntent(req.params.poolId, req.user.id);
  //     return res.status(201).json({ success: true, data });
  //   } catch (error) {
  //     return sendError(res, error, 'Unable to create payment intent.', 'Create payment intent failed');
  //   }
  // }

  // async paymentWebhook(req, res) {
  //   try {
  //     const data = await poolService.processPaymentWebhook(
  //       req.get('x-payment-signature'),
  //       req.body,
  //       req.rawBody
  //     );
  //     return res.status(200).json({ success: true, data });
  //   } catch (error) {
  //     return sendError(res, error, 'Unable to process payment webhook.', 'Payment webhook failed');
  //   }
  // }
}
