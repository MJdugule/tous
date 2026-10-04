import bcrypt from 'bcrypt';
import * as dbHelper from '../utilities/helpers/authHelper.js';
import { sendSignupOtpEmail } from '../utilities/helpers/emailHelper.js';
import type { SignupDTO, VerifyEmailDTO } from '../dtos/signupDtos.js';

export class SignupService {
  async processSignupRequest(payload: SignupDTO) {
    const existingByEmail = await dbHelper.findUserByEmailOrUsername(payload.email);
    const existingByUsername = await dbHelper.findUserByEmailOrUsername(payload.username);

    if (existingByEmail || existingByUsername) {
      throw new Error('Username or email is already taken.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await dbHelper.createUnverifiedUserSession({
      username: payload.username,
      email: payload.email,
      passwordHash,
      otp,
      expiresAt
    });

    await sendSignupOtpEmail(payload.email, otp);

    return { email: payload.email, message: 'Verification OTP has been dispatched to your email address.' };
  }

  async processVerifyEmailRequest(payload: VerifyEmailDTO) {
    const session = await dbHelper.findUnverifiedUserSessionByEmail(payload.email);

    if (!session) {
      throw new Error('No pending verification found for this email. Please signup first.');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new Error('Verification code has expired. Please signup again.');
    }

    if (session.otp !== payload.otp) {
      throw new Error('Invalid verification code.');
    }

    const user = await dbHelper.createVerifiedUserFromSession(payload.email);

    return {
      email: user.email,
      username: user.username,
      message: 'Email has been verified successfully.'
    };
  }
}