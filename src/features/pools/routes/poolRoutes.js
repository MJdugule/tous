import { Router } from 'express';
import { PoolController } from '../controllers/poolController.js';
import { authenticateUser } from '../../auth/middlewares/authenticateUser.js';
import {
  validateCreatePool,
  validateGender,
  validatePaymentWebhook,
  validatePoolStatusQuery
} from '../utilities/validators/poolValidators.js';

const router = Router();
const controller = new PoolController();

// router.post('/payments/webhook', validatePaymentWebhook, controller.paymentWebhook);

router.use(authenticateUser);
router.get('/available', controller.getAvailablePools);
router.post('/', validateCreatePool, controller.createPool);
router.post('/:poolId/register',  controller.registerPool);
router.get('/registered', controller.getMyRegisteredPools);

export default router;
