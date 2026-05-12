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
};
