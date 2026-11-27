import * as profileHelper from '../utilities/helpers/profileHelper.js';
import { toUserProfileDto } from '../dtos/profile.dto.js';
import { ProfileError } from '../utilities/errors/profileError.js';

export class ProfileService {

 async getUserProfile(userId){
  const user = await profileHelper.findUserById(userId);
  if(!user) throw new ProfileError("Profile not found", 400)
  return toUserProfileDto(user);
};

  async updateUserProfile(userId, updatePayload) {
    const user = await profileHelper.findUserById(userId);
  if(!user) throw new ProfileError("Profile not found", 400)
  const updatedUser = await profileHelper.updateUserProfileById(userId, updatePayload);
  return toUserProfileDto(updatedUser);
};
}