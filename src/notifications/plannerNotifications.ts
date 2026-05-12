import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { offlineCache } from '@/offline/cacheService';
import { mealPlannerService, type MealPlan, type UpcomingMealPlan } from '@/services/mealPlannerService';

const CHECK_INTERVAL_MS = 60 * 1000;
const FINAL_MINUTE_INTERVAL_MS = 1000;

export function buildReminderDedupeKey(plan: Pick<MealPlan, 'id' | 'reminder_version' | 'scheduled_start_at'>) {
  return `${plan.id}:${plan.reminder_version || 1}:${plan.scheduled_start_at}`;
}

export function formatPlanWindow(plan: Pick<MealPlan, 'time_window_label' | 'start_time' | 'end_time'>) {
  if (plan.time_window_label) return plan.time_window_label;
  return `${formatTime(plan.start_time)} - ${formatTime(plan.end_time)}`;
}

export function formatTime(value: string) {
  const [hourRaw, minuteRaw] = String(value || '').split(':');
  const hour24 = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return '';
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function parsePlannerInstant(value: string | Date, zone = 'Asia/Manila') {
  if (value instanceof Date) return DateTime.fromJSDate(value);
  const text = String(value || '').trim();
  if (!text) return DateTime.invalid('missing datetime');

  let parsed = DateTime.fromISO(text, { setZone: true });
  if (parsed.isValid) return parsed;

  parsed = DateTime.fromSQL(text, { zone });
  return parsed.isValid ? parsed : DateTime.invalid('invalid datetime');
}

function normalizeNow(now: Date | string, zone?: string) {
  return now instanceof Date ? DateTime.fromJSDate(now) : parsePlannerInstant(now, zone);
}

export function getPlanWindowStatus(
  plan: Pick<MealPlan, 'scheduled_start_at' | 'scheduled_end_at' | 'timezone'>,
  now: Date | string = new Date(),
) {
  const start = parsePlannerInstant(plan.scheduled_start_at, plan.timezone);
  const end = parsePlannerInstant(plan.scheduled_end_at, plan.timezone);
  const current = normalizeNow(now, plan.timezone);

  if (!start.isValid || !end.isValid || !current.isValid) return 'ended';
  if (current < start) return 'upcoming';
  if (current <= end) return 'active';
  return 'ended';
}

export function getCountdownText(
  plan: Pick<MealPlan, 'meal_type_label' | 'scheduled_start_at' | 'scheduled_end_at' | 'timezone'>,
  now: Date | string = new Date(),
) {
  const start = parsePlannerInstant(plan.scheduled_start_at, plan.timezone);
  const end = parsePlannerInstant(plan.scheduled_end_at, plan.timezone);
  const current = normalizeNow(now, plan.timezone);
  const label = plan.meal_type_label || 'Meal';

  if (!start.isValid || !end.isValid || !current.isValid) return `${label} window ended`;

  if (current < start) {
    const totalSeconds = Math.max(0, Math.floor(start.diff(current, 'seconds').seconds));
    const minutes = Math.ceil(totalSeconds / 60);
    if (minutes <= 1) return `${label} starts in less than a minute`;
    if (minutes < 60) return `${label} starts in ${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${label} starts in ${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ''}`;
  }

  if (current <= end) return `${label} is active now`;
  return `${label} window ended`;
}

export function getNextTickDelay(plan: Pick<MealPlan, 'scheduled_start_at' | 'timezone'>, now: Date | string = new Date()) {
  const start = parsePlannerInstant(plan.scheduled_start_at, plan.timezone);
  const current = normalizeNow(now, plan.timezone);
  if (!start.isValid || !current.isValid) return CHECK_INTERVAL_MS;
  const secondsUntilStart = Math.floor(start.diff(current, 'seconds').seconds);
  return secondsUntilStart >= 0 && secondsUntilStart <= 60 ? FINAL_MINUTE_INTERVAL_MS : CHECK_INTERVAL_MS;
}

export async function requestBrowserPlannerNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

async function hasFired(dedupeKey: string) {
  const cached = await offlineCache.reminderEvents.get(dedupeKey);
  return Boolean(cached?.data);
}

async function markFired(plan: MealPlan, channel: string) {
  const dedupeKey = buildReminderDedupeKey(plan);
  await offlineCache.reminderEvents.upsert(dedupeKey, {
    id: dedupeKey,
    meal_plan_id: plan.id,
    channel,
    fired_at: new Date().toISOString(),
  });
  mealPlannerService.recordReminderLog({
    meal_plan_id: plan.id,
    dedupe_key: dedupeKey,
    event_type: 'client_notification_fired',
    channel,
  }).catch(() => {});
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🍱',
  dinner: '🍽️',
};

const MEAL_TYPE_ACTION: Record<string, string> = {
  breakfast: 'Good morning, time to cook!',
  lunch: 'Lunch break! Start cooking now.',
  dinner: 'Dinner time! Fire up the stove.',
};

function notificationCopy(plan: MealPlan) {
  const recipeTitle = plan.recipe?.title || 'your planned meal';
  const mealType = plan.meal_type || '';
  const emoji = MEAL_TYPE_EMOJI[mealType] || '🍴';
  const action = MEAL_TYPE_ACTION[mealType] || 'Time to start cooking!';
  const timeWindow = formatPlanWindow(plan);
  const body = timeWindow ? `${action}\n${timeWindow}` : action;
  return { title: `${emoji} ${recipeTitle}`, body };
}

function reminderNotificationData(plan: MealPlan, dedupeKey: string) {
  return {
    type: 'meal_reminder',
    mealPlanId: plan.id,
    recipeId: plan.recipe?.id || plan.recipe_id,
    route: plan.recipe?.id ? `/recipe/${plan.recipe.id}` : '/planner',
    dedupeKey,
  };
}

function showInAppMealReminder(plan: MealPlan, dedupeKey: string) {
  if (typeof window === 'undefined') return false;

  const copy = notificationCopy(plan);
  const timeWindow = formatPlanWindow(plan);
  const action = MEAL_TYPE_ACTION[plan.meal_type || ''] || 'Time to start cooking!';
  const data = reminderNotificationData(plan, dedupeKey);
  toast(copy.title, {
    id: dedupeKey,
    description: timeWindow ? `${action} · ${timeWindow}` : action,
    duration: 12_000,
    action: {
      label: 'Open',
      onClick: () => window.location.assign(data.route),
    },
  });
  return true;
}

export async function showBrowserMealReminder(
  plan: MealPlan,
  deliveryOptions: { channel?: string; serverNow?: Date | string } = {},
) {
  const dedupeKey = buildReminderDedupeKey(plan);
  if (await hasFired(dedupeKey)) return false;
  if (getPlanWindowStatus(plan, deliveryOptions.serverNow || new Date()) !== 'active') return false;

  const copy = notificationCopy(plan);
  const data = reminderNotificationData(plan, dedupeKey);
  const didShowInApp = showInAppMealReminder(plan, dedupeKey);
  let didShowSystem = false;

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notificationOptions: NotificationOptions = {
        body: copy.body,
        tag: dedupeKey,
        data,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      };

      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
      if (registration?.showNotification) {
        await registration.showNotification(copy.title, notificationOptions);
        didShowSystem = true;
      } else {
        const notification = new Notification(copy.title, notificationOptions);
        notification.onclick = () => {
          window.focus();
          window.location.assign(data.route);
        };
        didShowSystem = true;
      }
    } catch {
      didShowSystem = false;
    }
  }

  if (!didShowInApp && !didShowSystem) return false;
  await markFired(plan, deliveryOptions.channel || 'web_local');
  return true;
}

export async function fireDueBrowserReminders(plans: MealPlan[], now: Date | string = new Date()) {
  const duePlans = plans.filter((plan) => {
    if (!plan.reminder_enabled || plan.notification_sent) return false;
    return getPlanWindowStatus(plan, now) === 'active';
  });

  for (const plan of duePlans) {
    await showBrowserMealReminder(plan, { serverNow: now });
  }
}

export async function refreshUpcomingPlannerReminders() {
  const data = await mealPlannerService.getUpcoming({ lookaheadHours: 24, lookbackHours: 3 });
  const plans = data.plans || [];
  await offlineCache.mealPlans.clear();
  if (plans.length > 0) {
    await offlineCache.mealPlans.upsertMany(plans as unknown as Array<{ id: number } & Record<string, unknown>>);
  }
  await fireDueBrowserReminders(plans, new Date(data.server_now));
  return data;
}

export type PlannerReminderSnapshot = {
  server_now: string;
  timezone: string;
  plans: UpcomingMealPlan[];
};
