import jwt from 'jsonwebtoken';
import User from '../../auth/models/user.model.js';

const getAccessTokenSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 bytes.');
  }

  return secret;
};

export const authenticateUser = async (req, res, next) => {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Bearer access token required.' });
  }

  try {
    const claims = jwt.verify(token, getAccessTokenSecret(), {
      algorithms: ['HS256'],
      issuer: 'tous',
      audience: 'tous-client'
    });

    if (typeof claims === 'string' || typeof claims.userId !== 'string') {
      return res.status(401).json({ success: false, message: 'Invalid access token.' });
    }

    const user = await User.findById(claims.userId);

    if (!user || !user.isVerified) {
      return res.status(401).json({ success: false, message: 'Invalid access token.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
    }

    console.error('[Pool Auth] Failed to authenticate request:', error);
    return res.status(500).json({ success: false, message: 'Unable to authenticate request.' });
  }
};
