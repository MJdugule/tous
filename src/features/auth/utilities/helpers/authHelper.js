import User from '../../models/user.model.js';
import PendingVerification from '../../models/pendingVerification.model.js';

export const findUserByEmailOrFullName = async (value) => {
  const normalized = String(value).toLowerCase();
  return User.findOne({ $or: [{ email: normalized }, { fullName: String(value) }] });
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

export const createUnverifiedUserSession = async (data) => {
  const email = data.email.toLowerCase();

  const session = await PendingVerification.findOneAndUpdate(
    { email },
    {
      $set: {
        // fullName: data.fullName,
        email,
        type: data.type,
        // passwordHash: data.passwordHash,
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
  console.log(email)
  return PendingVerification.findOne({ email: email.toLowerCase() });
};

export const createUser = async (data) => {
  const normalized = data.email.toLowerCase();

  // const session = await PendingVerification.findOne({ email: normalized });

  // if (!session) {
  //   throw new Error('No pending verification session found for this email.');
  // }

  const user = await User.findOneAndUpdate(
    { email: normalized },
    {
      $setOnInsert: {
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
        isVerified: data.isVerified,
        // verifiedAt: new Date()
      }
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  // await PendingVerification.deleteOne({ email: normalized });

  return user;
};

export const findAndUpdateUser = async (data) => {
  const normalized = data.email.toLowerCase();

  // const session = await PendingVerification.findOne({ email: normalized });

  // if (!session) {
  //   throw new Error('No pending verification session found for this email.');
  // }

  const user = await User.findOneAndUpdate(
    { email: normalized },
    {
      $set: data
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  console.log(user);

  // await PendingVerification.deleteOne({ email: normalized });

  return user;
};
