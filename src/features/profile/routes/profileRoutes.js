import { Router } from 'express';
import { ProfileController } from '../controllers/profileController.js';
import { authenticateUser } from '../middleware/authenticateUser.js';
import {
  validateUpdateProfileSchema,
  validateGender,
  validatePaymentWebhook,
  validatePoolStatusQuery
} from '../utilities/validators/profileValidators.js';

const router = Router();
const controller = new ProfileController();

// router.post('/payments/webhook', validatePaymentWebhook, controller.paymentWebhook);

router.use(authenticateUser);
router.get('/', controller.getMyProfile);
router.patch('/', validateUpdateProfileSchema, controller.updateMyProfile);

export default router;
