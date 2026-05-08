import { io } from 'socket.io-client';
import { apiBaseUrl } from '../api/api';
import { tokenStorage } from '../lib/tokenStorage';

const SOCKET_PATH = '/socket.io';
const AUTH_TOKEN_KEY = 'userToken';

export async function subscribePlannerSocketEvents({ onReminderDue, onPlansChanged } = {}) {
  const token = await tokenStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return () => {};

  const socket = io(apiBaseUrl, {
    path: SOCKET_PATH,
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  if (onReminderDue) {
    socket.on('planner:reminder_due', onReminderDue);
  }

  if (onPlansChanged) {
    socket.on('planner:plans_changed', onPlansChanged);
  }

  socket.on('connect_error', () => {
    // AppState refresh and local Expo schedules remain the fallback.
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
