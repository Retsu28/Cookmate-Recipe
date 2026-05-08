import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getNextTickDelay,
  getPlanWindowStatus,
  refreshUpcomingPlannerReminders,
  showBrowserMealReminder,
} from './plannerNotifications';
import { subscribePlannerSocketEvents } from './plannerRealtime';

const VISIBLE_REFRESH_MS = 60 * 1000;
const HIDDEN_REFRESH_MS = 5 * 60 * 1000;

export function PlannerReminderBridge() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return undefined;

    let stopped = false;
    let timer: number | undefined;

    const schedule = (snapshot?: Awaited<ReturnType<typeof refreshUpcomingPlannerReminders>>) => {
      if (stopped) return;
      const visibleDelay = (() => {
        const plans = snapshot?.plans || [];
        if (plans.length === 0) return VISIBLE_REFRESH_MS;
        return Math.min(
          VISIBLE_REFRESH_MS,
          ...plans.map((plan) => getNextTickDelay(plan, snapshot?.server_now || new Date())),
        );
      })();
      const delay = document.visibilityState === 'visible' ? visibleDelay : HIDDEN_REFRESH_MS;
      timer = window.setTimeout(run, delay);
    };

    const run = () => {
      window.clearTimeout(timer);
      refreshUpcomingPlannerReminders()
        .then((snapshot) => {
          schedule(snapshot);
        })
        .catch(() => {
          // Offline or permission-denied paths are expected; cached planner data
          // still powers the visible countdown UI.
          schedule();
        });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    const handleOnline = () => run();
    const dispatchPlannerSync = () => {
      window.dispatchEvent(new CustomEvent('cookmate:planner-sync'));
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    const unsubscribeSocket = subscribePlannerSocketEvents({
      onReminderDue: (event) => {
        if (event.plan && getPlanWindowStatus(event.plan, new Date(event.server_now)) === 'active') {
          showBrowserMealReminder(event.plan, {
            channel: 'web_socket',
            serverNow: event.server_now,
          }).catch(() => {});
        }
        run();
        dispatchPlannerSync();
      },
      onPlansChanged: () => {
        run();
        dispatchPlannerSync();
      },
    });
    run();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      unsubscribeSocket();
    };
  }, [isAuthenticated]);

  return null;
}

export default PlannerReminderBridge;
