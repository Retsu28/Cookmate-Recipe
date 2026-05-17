import api from '@/services/api';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async getNotifications(userId: number): Promise<Notification[]> {
    const response = await api.get<{ notifications: Notification[] }>(`/api/notifications/${userId}`);
    return response.notifications || [];
  },

  async markAsRead(notificationId: number): Promise<Notification> {
    const response = await api.patch<{ notification: Notification }>(`/api/notifications/${notificationId}/read`);
    return response.notification;
  },

  async markAllAsRead(): Promise<{ markedAsRead: number }> {
    const response = await api.patch<{ markedAsRead: number }>('/api/notifications/read-all');
    return response;
  },

  async deleteNotification(notificationId: number): Promise<void> {
    await api.delete(`/api/notifications/${notificationId}`);
  },

  async getPlannerStates(): Promise<{ ref_type: string; ref_id: number; is_read: boolean; is_deleted: boolean }[]> {
    const response = await api.get<{ states: { ref_type: string; ref_id: number; is_read: boolean; is_deleted: boolean }[] }>('/api/notifications/planner-states');
    return response.states || [];
  },

  async upsertPlannerState(ref_type: string, ref_id: number, is_read?: boolean, is_deleted?: boolean): Promise<void> {
    await api.patch('/api/notifications/planner-states', { ref_type, ref_id, is_read, is_deleted });
  },
};
