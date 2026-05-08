import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { DateTime } from 'luxon';
import { plannerApi } from '../api/api';
import { offlineCache } from '../offline/cacheService';
import { subscribePlannerSocketEvents } from '../socket/plannerSocket';

const DEVICE_ID_KEY = 'cookmate.notifications.deviceId';
const LOCAL_SCHEDULE_PREFIX = 'local_schedule:';
const MEAL_REMINDERS_CHANNEL_ID = 'meal-reminders-custom-v2';
const NOTIFICATION_SOUND = 'custom_sound.wav';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function buildReminderDedupeKey(plan) {
  return `${plan.id}:${plan.reminder_version || 1}:${plan.scheduled_start_at}`;
}

function notificationCopy(plan) {
  const recipeTitle = plan.recipe?.title || 'your planned meal';
  if (plan.meal_type === 'breakfast') {
    return { title: "It's breakfast time!", body: `Time to cook ${recipeTitle}.` };
  }
  if (plan.meal_type === 'lunch') {
    return { title: 'Lunch reminder', body: `${recipeTitle} is scheduled now.` };
  }
  if (plan.meal_type === 'dinner') {
    return { title: 'Dinner is ready to cook!', body: `${recipeTitle} is on your planner now.` };
  }
  return { title: `${plan.meal_type_label || 'Meal'} reminder`, body: `${recipeTitle} is scheduled now.` };
}

function parsePlannerInstant(value, zone = 'Asia/Manila') {
  if (value instanceof Date) return DateTime.fromJSDate(value);
  const text = String(value || '').trim();
  if (!text) return DateTime.invalid('missing datetime');

  let parsed = DateTime.fromISO(text, { setZone: true });
  if (parsed.isValid) return parsed;

  parsed = DateTime.fromSQL(text, { zone });
  return parsed.isValid ? parsed : DateTime.invalid('invalid datetime');
}

function isRunningInExpoGo() {
  return Constants.appOwnership === 'expo' || Boolean(Constants.expoGoConfig);
}

function getNotificationSound() {
  return isRunningInExpoGo() ? 'default' : NOTIFICATION_SOUND;
}

function normalizeNow(now, zone) {
  return now instanceof Date ? DateTime.fromJSDate(now) : parsePlannerInstant(now, zone);
}

export function getPlanWindowStatus(plan, now = new Date()) {
  const start = parsePlannerInstant(plan.scheduled_start_at, plan.timezone);
  const end = parsePlannerInstant(plan.scheduled_end_at, plan.timezone);
  const current = normalizeNow(now, plan.timezone);

  if (!start.isValid || !end.isValid || !current.isValid) return 'ended';
  if (current < start) return 'upcoming';
  if (current <= end) return 'active';
  return 'ended';
}

export function formatTime(value) {
  const [hourRaw, minuteRaw] = String(value || '').split(':');
  const hour24 = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return '';
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatPlanWindow(plan) {
  if (plan?.time_window_label) return plan.time_window_label;
  return `${formatTime(plan?.start_time)} - ${formatTime(plan?.end_time)}`;
}

export function getCountdownText(plan, now = new Date()) {
  const start = parsePlannerInstant(plan.scheduled_start_at, plan.timezone);
  const end = parsePlannerInstant(plan.scheduled_end_at, plan.timezone);
  const current = normalizeNow(now, plan.timezone);
  const label = plan.meal_type_label || 'Meal';

  if (!start.isValid || !end.isValid || !current.isValid) return `${label} window ended`;

  if (current < start) {
    const minutes = Math.ceil(Math.max(0, start.diff(current, 'seconds').seconds) / 60);
    if (minutes <= 1) return `${label} starts in less than a minute`;
    if (minutes < 60) return `${label} starts in ${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${label} starts in ${hours}h${remainder ? ` ${remainder}m` : ''}`;
  }

  if (current <= end) return `${label} is active now`;
  return `${label} window ended`;
}

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = `mobile-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  const channel = {
    name: 'Meal reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#f97316',
  };

  if (!isRunningInExpoGo()) {
    channel.sound = NOTIFICATION_SOUND;
  }

  await Notifications.setNotificationChannelAsync(MEAL_REMINDERS_CHANNEL_ID, channel);
}

export async function registerForPlannerPushNotifications() {
  await ensureAndroidChannel();
  const deviceId = await getDeviceId();

  if (!Device.isDevice) {
    return { deviceId, status: 'simulator' };
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    await plannerApi.registerReminderToken({
      device_id: deviceId,
      platform: Platform.OS,
      expo_push_token: `permission-denied-${deviceId}`,
      permission_status: finalStatus,
    }).catch(() => {});
    return { deviceId, status: finalStatus };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await plannerApi.registerReminderToken({
    device_id: deviceId,
    platform: Platform.OS,
    expo_push_token: token.data,
    permission_status: finalStatus,
  });

  return { deviceId, status: finalStatus, token: token.data };
}

async function hasFired(dedupeKey) {
  const cached = await offlineCache.reminderEvents.get(dedupeKey);
  return Boolean(cached?.data);
}

async function markFired(plan, channel = 'mobile_local') {
  const dedupeKey = buildReminderDedupeKey(plan);
  await offlineCache.reminderEvents.upsert(dedupeKey, {
    id: dedupeKey,
    meal_plan_id: plan.id,
    channel,
    fired_at: new Date().toISOString(),
  });
  plannerApi.recordReminderLog({
    meal_plan_id: plan.id,
    dedupe_key: dedupeKey,
    event_type: 'client_notification_fired',
    channel,
  }).catch(() => {});
}

async function cancelOldLocalSchedule(plan, dedupeKey) {
  const scheduleKey = `${LOCAL_SCHEDULE_PREFIX}${plan.id}`;
  const existing = await offlineCache.reminderEvents.get(scheduleKey);
  if (existing?.data?.dedupeKey && existing.data.dedupeKey !== dedupeKey && existing.data.localNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(existing.data.localNotificationId).catch(() => {});
  }
}

export async function scheduleLocalMealReminder(plan, now = new Date()) {
  if (!plan?.id || !plan.reminder_enabled || plan.notification_sent) return null;

  const dedupeKey = buildReminderDedupeKey(plan);
  const status = getPlanWindowStatus(plan, now);
  if (status === 'ended' || (await hasFired(dedupeKey))) return null;

  await ensureAndroidChannel();
  const scheduleKey = `${LOCAL_SCHEDULE_PREFIX}${plan.id}`;
  const existingSchedule = await offlineCache.reminderEvents.get(scheduleKey);
  if (existingSchedule?.data?.dedupeKey === dedupeKey && existingSchedule.data.localNotificationId) {
    return existingSchedule.data.localNotificationId;
  }
  await cancelOldLocalSchedule(plan, dedupeKey);

  const copy = notificationCopy(plan);
  const data = {
    type: 'meal_reminder',
    mealPlanId: plan.id,
    recipeId: plan.recipe?.id || plan.recipe_id,
    dedupeKey,
    route: plan.recipe?.id ? 'RecipeDetail' : 'Planner',
  };

  const trigger = status === 'active'
    ? null
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(plan.scheduled_start_at),
        channelId: MEAL_REMINDERS_CHANNEL_ID,
      };

  const localNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data,
      sound: getNotificationSound(),
    },
    trigger,
  });

  const deviceId = await getDeviceId();
  await offlineCache.reminderEvents.upsert(scheduleKey, {
    id: scheduleKey,
    dedupeKey,
    localNotificationId,
    scheduled_for: plan.scheduled_start_at,
  });
  plannerApi.acknowledgeLocalSchedule({
    meal_plan_id: plan.id,
    device_id: deviceId,
    reminder_version: plan.reminder_version || 1,
    local_notification_id: localNotificationId,
    scheduled_for: plan.scheduled_start_at,
  }).catch(() => {});

  return localNotificationId;
}

export async function syncPlannerLocalNotifications(plans) {
  const list = Array.isArray(plans) ? plans : [];
  await registerForPlannerPushNotifications().catch(() => {});
  for (const plan of list) {
    await scheduleLocalMealReminder(plan).catch(() => {});
  }
}

export async function refreshPlannerReminderCache() {
  const response = await plannerApi.getUpcoming({ lookaheadHours: 24, lookbackHours: 3 });
  const plans = response?.data?.plans || [];
  await offlineCache.mealPlans.clear();
  if (plans.length > 0) {
    await offlineCache.mealPlans.upsertMany(plans);
  }
  return plans;
}

export async function refreshAndSchedulePlannerReminders() {
  const plans = await refreshPlannerReminderCache();
  await syncPlannerLocalNotifications(plans);
  return plans;
}

function navigateFromNotification(navigationRef, data = {}) {
  if (!navigationRef?.isReady?.()) return;
  const recipeId = data.recipeId || data.recipe_id;
  if (recipeId) {
    navigationRef.navigate('RecipeDetail', { id: recipeId });
    return;
  }
  navigationRef.navigate('Main', { screen: 'Planner' });
}

let initialized = false;
let socketUnsubscribe = null;

export function initializePlannerNotifications(navigationRef) {
  if (initialized) return;
  initialized = true;

  Notifications.addNotificationReceivedListener((notification) => {
    const data = notification?.request?.content?.data || {};
    if (data.dedupeKey && data.mealPlanId) {
      offlineCache.reminderEvents.upsert(data.dedupeKey, {
        id: data.dedupeKey,
        meal_plan_id: data.mealPlanId,
        channel: 'mobile_local',
        fired_at: new Date().toISOString(),
      }).catch(() => {});
    }
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    navigateFromNotification(navigationRef, data);
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      refreshAndSchedulePlannerReminders().catch(() => {});
    }
  });

  subscribePlannerSocketEvents({
    onReminderDue: (event) => {
      if (event?.plan && getPlanWindowStatus(event.plan, event.server_now) === 'active') {
        scheduleLocalMealReminder(event.plan, event.server_now).catch(() => {});
      }
      refreshPlannerReminderCache().catch(() => {});
    },
    onPlansChanged: () => {
      refreshAndSchedulePlannerReminders().catch(() => {});
    },
  })
    .then((unsubscribe) => {
      socketUnsubscribe?.();
      socketUnsubscribe = unsubscribe;
    })
    .catch(() => {});

  refreshAndSchedulePlannerReminders().catch(() => {});
}
