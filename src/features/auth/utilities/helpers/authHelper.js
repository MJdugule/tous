import User from '../../models/user.model.js';
import PendingVerification from '../../models/pendingVerification.model.js';

export const findUserByEmailOrFullName = async (value) => {
  const normalized = String(value).toLowerCase();
  return User.findOne({ $or: [{ email: normalized }, { fullName: String(value) }] });
};

export const createUnverifiedUserSession = async (data) => {
  const email = data.email.toLowerCase();

  const session = await PendingVerification.findOneAndUpdate(
    { email },
    {
      $set: {
        fullName: data.fullName,
        email,
        passwordHash: data.passwordHash,
        otp: data.otp,
        expiresAt: data.expiresAt
      }
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  console.log(`💾 DB Helper: Saved unverified session for ${email}`);
  return session;
};

export const findUnverifiedUserSessionByEmail = async (email) => {
  return PendingVerification.findOne({ email: email.toLowerCase() });
};

export const createVerifiedUserFromSession = async (email) => {
  const normalized = email.toLowerCase();

  const session = await PendingVerification.findOne({ email: normalized });

  if (!session) {
    throw new Error('No pending verification session found for this email.');
  }

  const user = await User.findOneAndUpdate(
    { email: normalized },
    {
      $setOnInsert: {
        fullName: session.fullName,
        email: normalized,
        passwordHash: session.passwordHash,
        isVerified: true,
        verifiedAt: new Date()
      }
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await PendingVerification.deleteOne({ email: normalized });

  return user;
};
