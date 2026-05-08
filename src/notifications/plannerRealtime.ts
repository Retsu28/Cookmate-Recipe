import { io, type Socket } from 'socket.io-client';
import { authService } from '@/services/authService';
import type { MealPlan } from '@/services/mealPlannerService';

export type PlannerReminderDueEvent = {
  server_now: string;
  notification?: {
    id: number;
    dedupe_key: string;
    scheduled_for?: string | null;
  };
  reminder?: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
  plan?: MealPlan;
  window_status?: 'upcoming' | 'active' | 'ended';
};

export type PlannerPlansChangedEvent = {
  server_now: string;
  reason?: string;
  plan_id?: number;
  plan_ids?: number[];
  plan?: MealPlan;
};

type PlannerSocketHandlers = {
  onReminderDue?: (event: PlannerReminderDueEvent) => void;
  onPlansChanged?: (event: PlannerPlansChangedEvent) => void;
};

const SOCKET_PATH = '/socket.io';

function getSocketBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || window.location.origin;
}

export function subscribePlannerSocketEvents(handlers: PlannerSocketHandlers) {
  const token = authService.getToken();
  if (!token) return () => {};

  const socket: Socket = io(getSocketBaseUrl(), {
    path: SOCKET_PATH,
    auth: { token },
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });

  if (handlers.onReminderDue) {
    socket.on('planner:reminder_due', handlers.onReminderDue);
  }

  if (handlers.onPlansChanged) {
    socket.on('planner:plans_changed', handlers.onPlansChanged);
  }

  socket.on('connect_error', () => {
    // Polling in PlannerReminderBridge remains the fallback for offline,
    // expired-session, and proxy-misconfigured cases.
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
