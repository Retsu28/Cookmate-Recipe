import api from '@/services/api';
import authService from '@/services/authService';

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

function authHeaders(): Record<string, string> | undefined {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export const profileService = {
  getProfile(userId: number) {
    return api.get<{ profile: UserProfile }>(`/api/profile/${userId}`, authHeaders());
  },

  updateProfile(userId: number, data: AccountSettingsUpdate) {
    return api.put<{ profile: UserProfile }>(`/api/profile/${userId}`, data, authHeaders());
  },
};

export default profileService;
