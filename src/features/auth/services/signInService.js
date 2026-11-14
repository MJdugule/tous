import bcrypt from 'bcrypt';
import * as dbHelper from '../utilities/helpers/authHelper.js';

/** @typedef {import('../dtos/signIn.dto.js').SignInDTO} SignInDTO */
/** @typedef {import('../dtos/signIn.dto.js').SignedInUserDTO} SignedInUserDTO */

export class AuthenticationError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

export class SignInService {
  /**
   * @param {SignInDTO} payload
   * @returns {Promise<SignedInUserDTO>}
   */
  async processSignInRequest(payload) {
    const user = await dbHelper.findUserByEmail(payload.email);

    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      throw new AuthenticationError('Invalid email or password.');
    }

    if (!user.isVerified) {
      throw new AuthenticationError('Please verify your email before signing in.', 403);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email
    };
  }
}
