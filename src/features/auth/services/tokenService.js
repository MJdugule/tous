import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { AuthenticationError } from '../utilities/errors/authenticationError.js';
import * as dbHelper from '../utilities/helpers/authHelper.js';

/** @typedef {import('../dtos/refreshToken.dto.js').RefreshTokenDTO} RefreshTokenDTO */
/** @typedef {import('../dtos/refreshToken.dto.js').AuthTokensDTO} AuthTokensDTO */

const accessTokenLifetime = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);
const refreshTokenLifetime = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 604800);

const getAccessTokenSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('Invalid token');
  }

  return secret;
};

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const validateTokenLifetimes = () => {
  if (
    !Number.isSafeInteger(accessTokenLifetime) ||
    accessTokenLifetime <= 0 ||
    !Number.isSafeInteger(refreshTokenLifetime) ||
    refreshTokenLifetime <= 0
  ) {
    throw new Error('Access and refresh token lifetimes must be positive integer seconds.');
  }
};

export class TokenService {
  /**
   * @param {{ id: string, _id: import('mongoose').Types.ObjectId }} user
   * @returns {Promise<AuthTokensDTO>}
   */
  async issueTokens(user) {
    validateTokenLifetimes();
    const accessToken = jwt.sign(
      {
        role: user.role,
        userId: user.id,
        email: user.email
      },
      getAccessTokenSecret(),
      {
        issuer: 'tous',
        audience: 'tous-client',
        expiresIn: accessTokenLifetime,
        algorithm: 'HS256'
      }
    );
    const refreshToken = randomBytes(64).toString('base64url');

    await dbHelper.createTokenForUser({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTokenLifetime * 1000)
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTokenLifetime
    };
  }

  /**
   * @param {RefreshTokenDTO} payload
   * @returns {Promise<AuthTokensDTO>}
   */
  async refreshTokens(payload) {
    validateTokenLifetimes();
    getAccessTokenSecret();
    const activeToken = await dbHelper.updateTokenForUser(
      {
        tokenHash: hashToken(payload.refreshToken),
        revokedAt: null,
        expiresAt: { $gt: new Date() }
      },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );

    if (!activeToken) {
      throw new AuthenticationError('Invalid or expired refresh token.');
    }

    const user = await dbHelper.findUserById(activeToken.userId);

    if (!user || !user.isVerified) {
      throw new AuthenticationError('Invalid or expired refresh token.');
    }

    return this.issueTokens(user);
  }

  /**
   * @param {RefreshTokenDTO} payload
   */
  async revokeRefreshToken(payload) {
    await dbHelper.updateTokenForUser(
      { tokenHash: hashToken(payload.refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}