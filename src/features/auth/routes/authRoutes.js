import { Router } from 'express';
import { AuthController } from '../controllers/signupController.js';
import { validateSignupBody, validateVerifyEmailBody } from '../utilities/validators/authValidators.js';

const router = Router();
const controller = new AuthController();

// Validate input structure -> Pass to controller -> Execute domain service layer
router.post('/signup', validateSignupBody, controller.signup);
router.post('/verify-email', validateVerifyEmailBody, controller.verifyEmail);

export default router;
