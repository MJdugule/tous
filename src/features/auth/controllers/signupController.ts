import type { Request, Response } from 'express'; // Fixed: Explicit type import
import { SignupService } from '../services/signupService.js'; // Fixed: Explicit .js extension

const authService = new SignupService();

export class AuthController {
  async signup(req: Request, res: Response): Promise<any> {
    try {
      // payload data matches our clean structural definition layout
      const result = await authService.processSignupRequest(req.body);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'An unexpected registration error occurred.'
      });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<any> {
    try {
      const result = await authService.processVerifyEmailRequest(req.body);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'An unexpected email verification error occurred.'
      });
    }
  }
}