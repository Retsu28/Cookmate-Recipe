import api from '@/services/api';

type SettingsResponse = {
  value?: Record<string, unknown>;
};

export const settingsService = {
  async getSettings(userId: string, key: string): Promise<Record<string, unknown>> {
    const data = await api.get<SettingsResponse>(`/api/settings/${userId}/${key}`);
    return data.value && typeof data.value === 'object' ? data.value : {};
  },

  async saveSettings(
    userId: string,
    key: string,
    value: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const data = await api.put<SettingsResponse>(`/api/settings/${userId}/${key}`, { value });
    return data.value && typeof data.value === 'object' ? data.value : {};
  },
};

export default settingsService;
