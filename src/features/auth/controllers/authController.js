import { SignupService } from '../services/signupService.js';
import { SigninService } from '../services/signInService.js';
import { TokenService } from '../services/tokenService.js';
import { AuthenticationError } from '../utilities/errors/authenticationError.js';

const signupService = new SignupService();
const signinService = new SigninService();
const tokenService = new TokenService();

const toErrorMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

export class AuthController {
  async signup(req, res) {
    try {
      const result = await signupService.asyncSignupUser(req.body);

      return res.status(200).json({
        success: true,
        message: 'OTP has been sent to your email address.',
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: toErrorMessage(error, 'An unexpected registration error occurred.')
      });
    }
  }

  async signIn(req, res) {
    try {
      const result = await signinService.asyncSignInUser(req.body);

      return res.status(200).json({
        success: true,
        message: 'Signin successful',
        data: result
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      console.error('[Sign-in Controller] Sign-in failed:', error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected sign-in error occurred.'
      });
    }
  }

  async refresh(req, res) {
    try {
      const data = await tokenService.refreshTokens(req.body);

      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }

      console.error('[Auth Controller] Token refresh failed:', error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected token refresh error occurred.'
      });
    }
  }

  async signOut(req, res) {
    try {
      await tokenService.revokeRefreshToken(req.body);

      return res.status(200).json({
        success: true,
        message: 'Signed out successfully.'
      });
    } catch (error) {
      console.error('[Auth Controller] Sign-out failed:', error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected sign-out error occurred.'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const result = await signupService.asyncVerifyEmail(req.body);

      return res.status(200).json({
        success: true,
        message: 'Email has been verified successfully.',
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: toErrorMessage(error, 'An unexpected email verification error occurred.')
      });
    }
  }
}
