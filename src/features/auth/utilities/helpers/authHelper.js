import User from '../../models/user.model.js';
import Token from '../../models/token.model.js';
import PendingVerification from '../../models/pendingVerification.model.js';

export const findUserByEmailOrFullName = async (value) => {
  const normalized = String(value).toLowerCase();
  return User.findOne({ $or: [{ email: normalized }, { fullName: String(value) }] });
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

export const findUserById = async (id) => {
  return User.findById(id);
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
        gender: data.gender,
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

  const user = await User.create(
    // { email: normalized },
    {
      // $setOnInsert: {
      fullName: data.fullName,
      email: normalized,
      passwordHash: data.passwordHash,
      gender: data.gender,
      isVerified: data.isVerified,
      // verifiedAt: new Date()
      //   }
    }
  );

  return user;
};

export const findAndUpdateUser = async (data) => {
  const normalized = data.email.toLowerCase();

  const user = await User.findOneAndUpdate(
    { email: normalized },
    {
      $set: data
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  console.log(user);

  return user;
};

export const createTokenForUser = async (data) => {
  return Token.create(data);
};

export const updateTokenForUser = async (filter, update, options = {}) => {
  const token = await Token.findOneAndUpdate(filter, update, {
    new: true,
    ...options
  });
  return token;
};
