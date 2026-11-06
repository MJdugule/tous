import { SignupService } from '../services/signupService.js';

const authService = new SignupService();

const toErrorMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

export class AuthController {
  async signup(req, res) {
    try {
      // payload data matches our clean structural definition layout
      const result = await authService.processSignupRequest(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: toErrorMessage(error, 'An unexpected registration error occurred.')
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const result = await authService.processVerifyEmailRequest(req.body);

      return res.status(200).json({
        success: true,
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
