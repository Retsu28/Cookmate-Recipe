import api from '@/services/api';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  cooking_skill_level?: string | null;
  created_at?: string;
}

export interface AccountSettingsUpdate {
  email?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  cooking_skill_level?: string;
  current_password?: string;
  new_password?: string;
}

export const profileService = {
  getProfile(userId: number) {
    return api.get<{ profile: UserProfile }>(`/api/profile/${userId}`);
  },

  updateProfile(userId: number, data: AccountSettingsUpdate) {
    return api.put<{ profile: UserProfile }>(`/api/profile/${userId}`, data);
  },

  uploadAvatar(userId: number, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.postFormData<{ avatar_url: string }>(`/api/profile/${userId}/avatar`, formData);
  },

  deleteAccount(userId: number, currentPassword: string) {
    return api.delete<{ message: string }>(
      `/api/profile/${userId}`,
      { current_password: currentPassword }
    );
  },
};

export default profileService;
