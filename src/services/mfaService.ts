import { api } from '@/services/api';

export interface MfaStatus {
  mfa_enabled: boolean;
}

export interface MfaSetupData {
  secret: string;
  otpauthUrl: string;
  qrCode: string; // base64 data URL PNG
}

export interface MfaResult {
  success: boolean;
  message: string;
}

export const mfaService = {
  async getStatus(): Promise<MfaStatus> {
    return api.get<MfaStatus>('/api/mfa/status');
  },

  async setup(): Promise<MfaSetupData> {
    return api.post<MfaSetupData>('/api/mfa/setup');
  },

  async enable(secret: string, token: string): Promise<MfaResult> {
    return api.post<MfaResult>('/api/mfa/enable', { secret, token });
  },

  async disable(token: string): Promise<MfaResult> {
    return api.post<MfaResult>('/api/mfa/disable', { token });
  },

  async verify(userId: number, token: string): Promise<{ token: string; user: unknown }> {
    return api.post<{ token: string; user: unknown }>('/api/mfa/verify', { userId, token });
  },
};

export default mfaService;
