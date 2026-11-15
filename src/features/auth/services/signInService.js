import bcrypt from 'bcrypt';
import * as dbHelper from '../utilities/helpers/authHelper.js';
import { TokenService } from './tokenService.js';
import { AuthenticationError } from '../utilities/errors/authenticationError.js';

/** @typedef {import('../dtos/signIn.dto.js').SignInDTO} SignInDTO */
/** @typedef {import('../dtos/refreshToken.dto.js').SignInResponseDTO} SignInResponseDTO */

export class SigninService {
  constructor() {
    this.tokenService = new TokenService();
  }

  /**
   * @param {SignInDTO} payload
   * @returns {Promise<SignInResponseDTO>}
   */
  async asyncSignInUser(payload) {
    const user = await dbHelper.findUserByEmail(payload.email);

    // console.log(await bcrypt.compare(payload.password, user.passwordHash));
    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      throw new AuthenticationError('Invalid email or password.');
    }

    if (!user.isVerified) {
      throw new AuthenticationError('Please verify your email before signing in.', 403);
    }

    const tokens = await this.tokenService.issueTokens(user);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      ...tokens
    };
  }
}
