import { Router } from 'express';
import { PoolController } from '../controllers/poolController.js';
import { authenticateUser } from '../middleware/authenticateUser.js';
import {
  validateCreatePool,
  validateGender,
  validatePaymentWebhook,
  validatePoolStatusQuery
} from '../utilities/validators/poolValidators.js';

const router = Router();
const controller = new PoolController();

router.post('/payments/webhook', validatePaymentWebhook, controller.paymentWebhook);

router.use(authenticateUser);
router.get('/available', controller.getAvailablePools);
router.get('/mine/rooms', controller.getMyRooms);
router.patch('/me/gender', validateGender, controller.updateGender);
router.get('/', validatePoolStatusQuery, controller.listPools);
router.post('/', validateCreatePool, controller.createPool);
router.post('/:poolId/payment-intents', controller.createPaymentIntent);
router.get('/:poolId/rooms', controller.getPoolRooms);
router.post('/:poolId/join', controller.joinPool);

export default router;
