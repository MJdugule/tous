type VerifiedUser = {
  username: string;
  email: string;
  passwordHash: string;
  isVerified: true;
  verifiedAt: Date;
};

type UnverifiedUserSession = {
  username: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: Date;
};

const users = new Map<string, VerifiedUser>();
const pendingVerifications = new Map<string, UnverifiedUserSession>();

export const findUserByEmailOrUsername = async (identifier: string) => {
  const normalizedIdentifier = identifier.toLowerCase();

  for (const user of users.values()) {
    if (user.email.toLowerCase() === normalizedIdentifier || user.username.toLowerCase() === normalizedIdentifier) {
      return user;
    }
  }

  return null;
};

export const createUnverifiedUserSession = async (data: UnverifiedUserSession) => {
  pendingVerifications.set(data.email.toLowerCase(), data);
  console.log(`💾 DB Helper: Saved unverified session for ${data.email} with OTP ${data.otp}`);
  return data;
};

export const findUnverifiedUserSessionByEmail = async (email: string) => {
  return pendingVerifications.get(email.toLowerCase()) || null;
};

export const createVerifiedUserFromSession = async (email: string) => {
  const session = pendingVerifications.get(email.toLowerCase());

  if (!session) {
    throw new Error('No pending verification session found for this email.');
  }

  const user: VerifiedUser = {
    username: session.username,
    email: session.email,
    passwordHash: session.passwordHash,
    isVerified: true,
    verifiedAt: new Date()
  };

  users.set(user.email.toLowerCase(), user);
  pendingVerifications.delete(user.email.toLowerCase());

  return user;
};