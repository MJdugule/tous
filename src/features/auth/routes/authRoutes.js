import { Router } from 'express';
import { AuthController } from '../controllers/signupController.js';
import { validateUserSignUp, validateUserVerifyEmail } from '../utilities/validators/authValidators.js';

const router = Router();
const controller = new AuthController();

// Validate input structure -> Pass to controller -> Execute domain service layer
router.post('/signup', validateUserSignUp, controller.signup);
router.post('/verify-email', validateUserVerifyEmail, controller.verifyEmail);

export default router;
