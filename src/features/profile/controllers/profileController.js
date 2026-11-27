import { ProfileError } from '../utilities/errors/profileError.js';
import { ProfileService } from '../services/profileService.js';

const profileService = new ProfileService();

const sendError = (res, error, fallback, context) => {
  if (error instanceof ProfileError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  console.error(`[Profile Controller] ${context}:`, error);
  return res.status(500).json({ success: false, message: fallback });
};

export class ProfileController {
   async getMyProfile(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const profile = await profileService.getUserProfile(userId);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
      return sendError(res, error, 'Unable to get user profile.', 'Error');
  }
};

async updateMyProfile(req, res, next) {
  try {
    const userId = req.user._id || req.user.id;
    const updatedProfile = await profileService.updateUserProfile(userId, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    return sendError(res, error, 'Unable to update user profile.', 'Error');
  }
};
}
