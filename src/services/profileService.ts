import api from '@/services/api';
import authService from '@/services/authService';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';

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

  async uploadAvatar(userId: number, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(`${API_BASE_URL}/api/profile/${userId}/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: formData,
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON response */
    }

    if (!res.ok) {
      const msg =
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `Avatar upload failed (${res.status})`;
      throw new Error(msg);
    }

    return data as { avatar_url: string };
  },

  deleteAccount(userId: number, currentPassword: string) {
    return api.delete<{ message: string }>(
      `/api/profile/${userId}`,
      { current_password: currentPassword },
      authHeaders()
    );
  },
};

export default profileService;
