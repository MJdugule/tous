import User from '../../../auth/models/user.model.js';

const SENSITIVE_FIELDS = [
  'email',
  'passwordHash',
  'password',
  'role',
  'isVerified',
  'verifiedAt',
  'isProfileComplete',
  '_id',
];

export const findUserById = async (userId) => {
  const user = await User.findById(userId);
  return user;
};

export const updateUserProfileById = async (userId, updates) => {
  const user = await User.findById(userId);
  // Defense-in-depth: strip any sensitive fields even if bypassed
  for (const field of SENSITIVE_FIELDS) {
    delete updates[field];
  }

  Object.assign(user, updates);

  // Recalculate whether all 6 profile screens are now filled out
  user.isProfileComplete = Boolean(
    user.fullName &&
      user.age &&
      user.gender &&
      user.location &&
      user.aboutYou &&
      Array.isArray(user.interests) &&
      user.interests.length > 0 &&
      user.relationshipGoal &&
      Array.isArray(user.interestedIn) &&
      user.interestedIn.length > 0 &&
      Array.isArray(user.preferredAgeRange) &&
      user.preferredAgeRange.length > 0 &&
      Array.isArray(user.languages) &&
      user.languages.length > 0 &&
      user.drinking &&
      user.smoking &&
      user.pets &&
      Array.isArray(user.photos) &&
      user.photos.length === 4
  );

  await user.save();
  return user;
};


