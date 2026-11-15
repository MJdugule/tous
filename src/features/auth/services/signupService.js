import bcrypt from 'bcrypt';
import * as dbHelper from '../utilities/helpers/authHelper.js';
import { sendSignupOtpEmail } from '../utilities/helpers/emailHelper.js';
import { TokenService } from './tokenService.js';

/** @typedef {import('../dtos/signup.dto.js').SignupDTO} SignupDTO */
/** @typedef {import('../dtos/verifyEmail.dto.js').VerifyEmailDTO} VerifyEmailDTO */
/** @typedef {import('../dtos/signup.dto.js').SignupResponseDTO} SignupResponseDTO */
/** @typedef {import('../dtos/verifyEmail.dto.js').VerifiedEmailDTO} VerifiedEmailDTO */

const tokenService = new TokenService();

export class SignupService {
  /**
   * @param {SignupDTO} payload
   * @returns {Promise<SignupResponseDTO>}
   */
  async asyncSignupUser(payload) {
    const existingByEmail = await dbHelper.findUserByEmail(payload.email);
    // const existingByFullName = await dbHelper.findUserByEmailOrFullName(payload.fullName);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    if (existingByEmail && !existingByEmail.isVerified) {
      await dbHelper.createUnverifiedUserSession({
      email: payload.email,
      type: "REGISTRATION",
      otp,
      expiresAt
    });

    await sendSignupOtpEmail(payload.email, otp);
    return { email: payload.email, };
    }

    if (existingByEmail && existingByEmail.isVerified) {
      throw new Error('This email is already registered');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(payload.password, saltRounds);
    // payload.password = passwordHash

    

    await dbHelper.createUser({
        fullName: payload.fullName,
        email: payload.email,
        passwordHash: payload.passwordHash,
        isVerified: false
        // role: "USER"
        // verifiedAt: new Date()
      });
    await dbHelper.createUnverifiedUserSession({
      email: payload.email,
      type: "REGISTRATION",
      otp,
      expiresAt
    });

    await sendSignupOtpEmail(payload.email, otp);

    return { email: payload.email, };
  }

  /**
   * @param {VerifyEmailDTO} payload
   * @returns {Promise<VerifiedEmailDTO>}
   */
  async asyncVerifyEmail(payload) {
    const session = await dbHelper.findUnverifiedUserSessionByEmail(payload.email);
    console.log(session);

    if (!session) {
      throw new Error('Invalid Email or otp');
    }

   

    if (session.otp !== payload.otp) {
      throw new Error('Invalid verification code.');
    }

     if (session.expiresAt.getTime() < Date.now()) {
      throw new Error('Verification code has expired.');
    }

    console.log(session.type);

    if (payload.type === "REGISTRATION") {
      console.log(payload.email);
      payload = {
        email: payload.email,
        isVerified: true,
        verifiedAt: new Date()
      }
      const user = await dbHelper.findAndUpdateUser(payload);
      const tokens = await tokenService.issueTokens(user);
            console.log("user : ${user}");

      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        ...tokens
      };
    }
    return {

    }

  }

  /**
   * @param {VerifyEmailDTO} payload
   * @returns {Promise<VerifiedEmailDTO>}
   */
  async asyncResendVerificationEmail(payload) {
    const session = await dbHelper.findUnverifiedUserSessionByEmail(payload.email);

    if (!session) {
      throw new Error('Invalid Email or otp');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new Error('Verification code has expired. Please signup again.');
    }

    if (session.otp !== payload.otp) {
      throw new Error('Invalid verification code.');
    }

    const user = await dbHelper.createUser(payload.email);
    const tokens = await tokenService.issueTokens(user);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      ...tokens
    };
  }
}
