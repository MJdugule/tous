import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import {
  validateUserSignUp,
  validateUserVerifyEmail,
  validateUserSignIn,
  validateRefreshToken
} from '../utilities/validators/authValidators.js';

const router = Router();
const controller = new AuthController();

// Validate input structure -> Pass to controller -> Execute domain service layer
// router.use('/signin', signInRoutes);
router.post('/signin', validateUserSignIn, controller.signIn);
router.post('/refresh', validateRefreshToken, controller.refresh);
router.post('/signout', validateRefreshToken, controller.signOut);
router.post('/signup', validateUserSignUp, controller.signup);
router.post('/verify-email', validateUserVerifyEmail, controller.verifyEmail);

export default router;
