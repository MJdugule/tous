import bcrypt from 'bcrypt';
import * as dbHelper from '../utilities/helpers/authHelper.js';
import { sendSignupOtpEmail } from '../utilities/helpers/emailHelper.js';

/**
 * @typedef {Object} SignupDTO
 * @property {string} fullName
 * @property {string} email
 * @property {string} password
 * @property {string} confirmPassword
 */

/**
 * @typedef {Object} VerifyEmailDTO
 * @property {string} email
 * @property {string} otp
 */

export class SignupService {
  async processSignupRequest(payload) {
    const existingByEmail = await dbHelper.findUserByEmailOrFullName(payload.email);
    const existingByFullName = await dbHelper.findUserByEmailOrFullName(payload.fullName);

    if (existingByEmail || existingByFullName) {
      throw new Error('Full name or email is already taken.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await dbHelper.createUnverifiedUserSession({
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
      otp,
      expiresAt
    });

    await sendSignupOtpEmail(payload.email, otp);

    return { email: payload.email, message: 'Verification OTP has been dispatched to your email address.' };
  }

  async processVerifyEmailRequest(payload) {
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
      fullName: user.fullName,
      message: 'Email has been verified successfully.'
    };
  }
}
