const { Expo } = require('expo-server-sdk');
const { pool } = require('../config/db');
const {
  MEAL_TYPE_LABELS,
  buildDedupeKey,
  formatWindowLabel,
  getWindowStatus,
  parseInstant,
} = require('./plannerTime');
const { emitPlannerReminderDue } = require('../realtime/plannerSocket');

const expo = new Expo();
const MAX_RETRY_COUNT = 5;

function sanitizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toIsoInstant(value, timezone) {
  const parsed = parseInstant(value, timezone);
  return parsed.isValid ? parsed.toUTC().toISO({ suppressMilliseconds: false }) : null;
}

const MEAL_TYPE_EMOJI = {
  breakfast: '\ud83c\udf05',
  lunch: '\ud83c\udf71',
  dinner: '\ud83c\udf7d\ufe0f',
};

const MEAL_TYPE_ACTION = {
  breakfast: 'Good morning, time to cook!',
  lunch: 'Lunch break! Start cooking now.',
  dinner: 'Dinner time! Fire up the stove.',
};

function buildReminderText(plan) {
  const mealType = String(plan.meal_type || '').toLowerCase();
  const recipeTitle = sanitizeText(plan.recipe_title, 'your planned meal');
  const emoji = MEAL_TYPE_EMOJI[mealType] || '\ud83c\udf74';
  const timeWindow = formatWindowLabel(plan.start_time, plan.end_time);
  const action = MEAL_TYPE_ACTION[mealType] || 'Time to start cooking!';
  const body = timeWindow ? `${action}\n${timeWindow}` : action;
  return {
    title: `${emoji} ${recipeTitle}`,
    body,
  };
}

function buildReminderPayload(plan) {
  const text = buildReminderText(plan);
  return {
    title: text.title,
    body: text.body,
    data: {
      type: 'meal_reminder',
      mealPlanId: Number(plan.id),
      recipeId: Number(plan.recipe_id),
      mealType: plan.meal_type,
      plannedDate: plan.planned_date,
      scheduledStartAt: toIsoInstant(plan.scheduled_start_at, plan.timezone),
      scheduledEndAt: toIsoInstant(plan.scheduled_end_at, plan.timezone),
      route: plan.recipe_id ? `/recipe/${plan.recipe_id}` : '/planner',
      screen: plan.recipe_id ? 'RecipeDetail' : 'Planner',
    },
  };
}

function toClientReminderPlan(plan) {
  const mealType = String(plan.meal_type || '').toLowerCase();
  return {
    id: Number(plan.id),
    user_id: Number(plan.user_id),
    recipe_id: Number(plan.recipe_id),
    planned_date: plan.planned_date,
    meal_type: mealType,
    meal_type_label: MEAL_TYPE_LABELS[mealType] || mealType || 'Meal',
    start_time: plan.start_time,
    end_time: plan.end_time,
    time_window_label: formatWindowLabel(plan.start_time, plan.end_time),
    timezone: plan.timezone,
    scheduled_start_at: toIsoInstant(plan.scheduled_start_at, plan.timezone),
    scheduled_end_at: toIsoInstant(plan.scheduled_end_at, plan.timezone),
    reminder_enabled: plan.reminder_enabled !== false,
    custom_time_enabled: plan.custom_time_enabled === true,
    notification_sent: plan.notification_sent === true,
    notification_sent_at: plan.notification_sent_at || null,
    reminder_version: Number(plan.reminder_version || 1),
    recipe: {
      id: Number(plan.recipe_id),
      title: plan.recipe_title,
      description: null,
      category: null,
      region_or_origin: null,
      image_url: null,
      total_time_minutes: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      difficulty: null,
      servings: null,
    },
  };
}

async function logReminderEvent({
  mealPlanId,
  plannerNotificationId,
  userId,
  deviceId = null,
  channel,
  eventType,
  dedupeKey = null,
  metadata = {},
}) {
  try {
    await pool.query(
      `INSERT INTO reminder_logs
        (meal_plan_id, planner_notification_id, user_id, device_id, channel, event_type, dedupe_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        mealPlanId || null,
        plannerNotificationId || null,
        userId || null,
        deviceId,
        channel,
        eventType,
        dedupeKey,
        JSON.stringify(metadata || {}),
      ]
    );
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('[plannerReminder/logReminderEvent] skipped:', err.message);
    }
  }
}

async function fetchReminderPlan(planId) {
  const result = await pool.query(
    `SELECT
       mp.id,
       mp.user_id,
       mp.recipe_id,
       TO_CHAR(mp.planned_date, 'YYYY-MM-DD') AS planned_date,
       LOWER(mp.meal_type) AS meal_type,
       TO_CHAR(mp.start_time, 'HH24:MI') AS start_time,
       TO_CHAR(mp.end_time, 'HH24:MI') AS end_time,
       mp.timezone,
       mp.scheduled_start_at,
       mp.scheduled_end_at,
       mp.reminder_enabled,
       mp.custom_time_enabled,
       mp.notification_sent,
       mp.notification_sent_at,
       mp.reminder_version,
       r.title AS recipe_title
     FROM meal_plans mp
     JOIN recipes r ON r.id = mp.recipe_id
     WHERE mp.id = $1`,
    [planId]
  );

  return result.rows[0] || null;
}

async function cancelPendingPlannerNotifications(planId, reason = 'plan_changed') {
  await pool.query(
    `UPDATE planner_notifications
     SET status = 'cancelled',
         last_error = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE meal_plan_id = $1
       AND status IN ('pending', 'failed', 'processing')`,
    [planId, reason]
  );
}

async function syncPlannerNotificationForPlan(planId) {
  const plan = await fetchReminderPlan(planId);
  if (!plan) return null;

  const dedupeKey = buildDedupeKey(plan);

  await pool.query(
    `UPDATE planner_notifications
     SET status = 'cancelled',
         last_error = 'superseded_by_new_plan_version',
         updated_at = CURRENT_TIMESTAMP
     WHERE meal_plan_id = $1
       AND dedupe_key <> $2
       AND status IN ('pending', 'failed', 'processing')`,
    [plan.id, dedupeKey]
  );

  if (!plan.reminder_enabled) {
    await cancelPendingPlannerNotifications(plan.id, 'reminder_disabled');
    return null;
  }

  const status = getWindowStatus(plan);
  if (status.status === 'ended') {
    await cancelPendingPlannerNotifications(plan.id, 'window_already_ended');
    return null;
  }

  const payload = buildReminderPayload(plan);
  const result = await pool.query(
    `INSERT INTO planner_notifications
       (meal_plan_id, user_id, dedupe_key, scheduled_for, expires_at, status, payload)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb)
     ON CONFLICT (dedupe_key) DO UPDATE
       SET scheduled_for = EXCLUDED.scheduled_for,
           expires_at = EXCLUDED.expires_at,
           status = CASE
             WHEN planner_notifications.status IN ('sent', 'skipped', 'missed') THEN planner_notifications.status
             ELSE 'pending'
           END,
           payload = EXCLUDED.payload,
           last_error = NULL,
           updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      plan.id,
      plan.user_id,
      dedupeKey,
      plan.scheduled_start_at,
      plan.scheduled_end_at,
      JSON.stringify({
        ...payload,
        windowLabel: formatWindowLabel(plan.start_time, plan.end_time),
      }),
    ]
  );

  return result.rows[0] || null;
}

async function syncPlannerNotificationsForPlans(planIds) {
  const ids = Array.from(new Set((planIds || []).map(parsePositiveInteger).filter(Boolean)));
  const synced = [];
  for (const id of ids) {
    const notification = await syncPlannerNotificationForPlan(id);
    if (notification) synced.push(notification);
  }
  return synced;
}

async function registerReminderToken(userId, payload) {
  const deviceId = sanitizeText(payload?.device_id || payload?.deviceId);
  const platform = sanitizeText(payload?.platform, 'unknown').slice(0, 40);
  const expoPushToken = sanitizeText(payload?.expo_push_token || payload?.expoPushToken);
  const permissionStatus = sanitizeText(payload?.permission_status || payload?.permissionStatus, 'unknown').slice(0, 40);

  if (!deviceId || !expoPushToken || !Expo.isExpoPushToken(expoPushToken)) {
    const err = new Error('Valid device_id and Expo push token are required.');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `UPDATE planner_notification_tokens
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE expo_push_token = $1
       AND (user_id <> $2 OR device_id <> $3)`,
    [expoPushToken, userId, deviceId]
  );

  const result = await pool.query(
    `INSERT INTO planner_notification_tokens
       (user_id, device_id, platform, expo_push_token, permission_status, is_active, last_registered_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, device_id) DO UPDATE
       SET platform = EXCLUDED.platform,
           expo_push_token = EXCLUDED.expo_push_token,
           permission_status = EXCLUDED.permission_status,
           is_active = TRUE,
           last_error = NULL,
           last_registered_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     RETURNING id, user_id, device_id, platform, expo_push_token, permission_status, is_active, last_registered_at`,
    [userId, deviceId, platform, expoPushToken, permissionStatus]
  );

  return result.rows[0];
}

async function acknowledgeLocalSchedule(userId, payload) {
  const mealPlanId = parsePositiveInteger(payload?.meal_plan_id || payload?.mealPlanId);
  const deviceId = sanitizeText(payload?.device_id || payload?.deviceId);
  const reminderVersion = parsePositiveInteger(payload?.reminder_version || payload?.reminderVersion);
  const localNotificationId = sanitizeText(payload?.local_notification_id || payload?.localNotificationId);
  const scheduledFor = payload?.scheduled_for || payload?.scheduledFor;

  if (!mealPlanId || !deviceId || !reminderVersion || !localNotificationId || !scheduledFor) {
    const err = new Error('meal_plan_id, device_id, reminder_version, local_notification_id, and scheduled_for are required.');
    err.status = 400;
    throw err;
  }

  const ownership = await pool.query(
    `SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [mealPlanId, userId]
  );
  if (ownership.rowCount === 0) {
    const err = new Error('Meal plan not found.');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `UPDATE planner_device_schedules
     SET is_active = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE meal_plan_id = $1
       AND device_id = $2
       AND reminder_version <> $3`,
    [mealPlanId, deviceId, reminderVersion]
  );

  const result = await pool.query(
    `INSERT INTO planner_device_schedules
       (user_id, meal_plan_id, device_id, reminder_version, local_notification_id, scheduled_for, is_active, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (meal_plan_id, device_id, reminder_version) DO UPDATE
       SET local_notification_id = EXCLUDED.local_notification_id,
           scheduled_for = EXCLUDED.scheduled_for,
           is_active = TRUE,
           scheduled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, mealPlanId, deviceId, reminderVersion, localNotificationId, scheduledFor]
  );

  await logReminderEvent({
    mealPlanId,
    userId,
    deviceId,
    channel: 'mobile_local',
    eventType: 'local_schedule_ack',
    metadata: { reminderVersion, localNotificationId, scheduledFor },
  });

  return result.rows[0];
}

async function claimDuePlannerNotifications(limit = 50) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `WITH due AS (
         SELECT pn.id
         FROM planner_notifications pn
         WHERE pn.status IN ('pending', 'failed')
           AND pn.scheduled_for <= clock_timestamp()
           AND (pn.next_retry_at IS NULL OR pn.next_retry_at <= clock_timestamp())
         ORDER BY pn.scheduled_for ASC, pn.id ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE planner_notifications pn
       SET status = 'processing',
           updated_at = CURRENT_TIMESTAMP
       FROM due
       WHERE pn.id = due.id
       RETURNING pn.*`,
      [Math.max(1, Math.min(Number(limit) || 50, 250))]
    );
    await client.query('COMMIT');
    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function fetchNotificationContext(notificationId) {
  const result = await pool.query(
    `SELECT
       pn.id AS planner_notification_id,
       pn.dedupe_key,
       pn.retry_count,
       pn.payload,
       mp.id,
       mp.user_id,
       mp.recipe_id,
       TO_CHAR(mp.planned_date, 'YYYY-MM-DD') AS planned_date,
       LOWER(mp.meal_type) AS meal_type,
       TO_CHAR(mp.start_time, 'HH24:MI') AS start_time,
       TO_CHAR(mp.end_time, 'HH24:MI') AS end_time,
       mp.timezone,
       mp.scheduled_start_at,
       mp.scheduled_end_at,
       mp.reminder_enabled,
       mp.custom_time_enabled,
       mp.notification_sent,
       mp.notification_sent_at,
       mp.reminder_version,
       r.title AS recipe_title
     FROM planner_notifications pn
     JOIN meal_plans mp ON mp.id = pn.meal_plan_id
     JOIN recipes r ON r.id = mp.recipe_id
     WHERE pn.id = $1`,
    [notificationId]
  );

  return result.rows[0] || null;
}

async function getRemoteTargets(plan) {
  const result = await pool.query(
    `SELECT
       t.id,
       t.user_id,
       t.device_id,
       t.platform,
       t.expo_push_token,
       EXISTS (
         SELECT 1
         FROM planner_device_schedules ds
         WHERE ds.meal_plan_id = $2
           AND ds.device_id = t.device_id
           AND ds.reminder_version = $3
           AND ds.is_active = TRUE
       ) AS has_local_schedule
     FROM planner_notification_tokens t
     WHERE t.user_id = $1
       AND t.is_active = TRUE
       AND COALESCE(t.permission_status, 'granted') = 'granted'`,
    [plan.user_id, plan.id, plan.reminder_version]
  );

  const rows = result.rows || [];
  return {
    localScheduleCount: rows.filter((row) => row.has_local_schedule).length,
    remoteTargets: rows.filter((row) => !row.has_local_schedule),
  };
}

async function deactivateTokens(tokenRows, reason) {
  const tokens = tokenRows.map((row) => row.expo_push_token).filter(Boolean);
  if (tokens.length === 0) return;
  await pool.query(
    `UPDATE planner_notification_tokens
     SET is_active = FALSE,
         last_error = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE expo_push_token = ANY($1::text[])`,
    [tokens, reason]
  );
}

async function sendExpoReminderPushes(targets, plan, notification) {
  const payload = buildReminderPayload(plan);
  const validTargets = targets.filter((target) => Expo.isExpoPushToken(target.expo_push_token));
  const messages = validTargets.map((target) => ({
      to: target.expo_push_token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: {
        ...payload.data,
        dedupeKey: notification.dedupe_key,
      },
      channelId: 'meal-reminders',
      priority: 'high',
    }));

  let sentCount = 0;
  let failedCount = 0;
  const invalidTargets = [];
  const errors = [];

  let cursor = 0;
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const chunkTargets = validTargets.slice(cursor, cursor + chunk.length);
    cursor += chunk.length;
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sentCount += 1;
        return;
      }

      failedCount += 1;
      errors.push(ticket.message || ticket.details?.error || 'Expo push failed');
      if (ticket.details?.error === 'DeviceNotRegistered') {
        invalidTargets.push(chunkTargets[index]);
      }
    });
  }

  if (invalidTargets.length > 0) {
    await deactivateTokens(invalidTargets, 'DeviceNotRegistered');
  }

  return { sentCount, failedCount, errors };
}

async function markNotificationTerminal(notificationId, status, { lastError = null, sent = false } = {}) {
  await pool.query(
    `UPDATE planner_notifications
     SET status = $2,
         sent_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE sent_at END,
         last_error = $4,
         next_retry_at = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [notificationId, status, sent, lastError]
  );
}

async function markPlanNotificationSent(planId) {
  await pool.query(
    `UPDATE meal_plans
     SET notification_sent = TRUE,
         notification_sent_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [planId]
  );
}

async function markNotificationForRetry(notification, errorMessage) {
  const retryCount = Number(notification.retry_count || 0) + 1;
  const backoffSeconds = Math.min(60 * 30, Math.pow(2, retryCount) * 30);
  await pool.query(
    `UPDATE planner_notifications
     SET status = 'failed',
         retry_count = $2,
         next_retry_at = clock_timestamp() + ($3 || ' seconds')::interval,
         last_error = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [notification.planner_notification_id || notification.id, retryCount, String(backoffSeconds), errorMessage]
  );
}

async function processPlannerNotification(notification) {
  const plan = await fetchNotificationContext(notification.id);
  if (!plan) {
    await markNotificationTerminal(notification.id, 'skipped', { lastError: 'plan_not_found' });
    return { status: 'skipped', reason: 'plan_not_found' };
  }

  const windowStatus = getWindowStatus(plan);
  if (!plan.reminder_enabled) {
    await markNotificationTerminal(notification.id, 'skipped', { lastError: 'reminder_disabled' });
    await logReminderEvent({
      mealPlanId: plan.id,
      plannerNotificationId: notification.id,
      userId: plan.user_id,
      channel: 'server_push',
      eventType: 'skipped_disabled',
      dedupeKey: notification.dedupe_key,
    });
    return { status: 'skipped', reason: 'reminder_disabled' };
  }

  if (plan.notification_sent) {
    await markNotificationTerminal(notification.id, 'skipped', { lastError: 'duplicate_suppressed' });
    await logReminderEvent({
      mealPlanId: plan.id,
      plannerNotificationId: notification.id,
      userId: plan.user_id,
      channel: 'server_push',
      eventType: 'duplicate_suppressed',
      dedupeKey: notification.dedupe_key,
    });
    return { status: 'skipped', reason: 'duplicate_suppressed' };
  }

  if (windowStatus.status === 'ended') {
    await markNotificationTerminal(notification.id, 'missed', { lastError: 'meal_window_ended' });
    await logReminderEvent({
      mealPlanId: plan.id,
      plannerNotificationId: notification.id,
      userId: plan.user_id,
      channel: 'server_push',
      eventType: 'missed_window_ended',
      dedupeKey: notification.dedupe_key,
    });
    return { status: 'missed', reason: 'meal_window_ended' };
  }

  emitPlannerReminderDue(plan.user_id, {
    notification: {
      id: Number(notification.id),
      dedupe_key: notification.dedupe_key,
      scheduled_for: toIsoInstant(notification.scheduled_for, plan.timezone),
    },
    reminder: buildReminderPayload(plan),
    plan: toClientReminderPlan(plan),
    window_status: windowStatus.status,
  });

  const { localScheduleCount, remoteTargets } = await getRemoteTargets(plan);
  if (remoteTargets.length === 0 && localScheduleCount > 0) {
    await markNotificationTerminal(notification.id, 'sent', { sent: true });
    await markPlanNotificationSent(plan.id);
    await logReminderEvent({
      mealPlanId: plan.id,
      plannerNotificationId: notification.id,
      userId: plan.user_id,
      channel: 'mobile_local',
      eventType: 'local_schedule_present',
      dedupeKey: notification.dedupe_key,
      metadata: { localScheduleCount },
    });
    return { status: 'sent', reason: 'handled_by_local_schedule' };
  }

  if (remoteTargets.length === 0) {
    await markNotificationTerminal(notification.id, 'skipped', { lastError: 'no_push_targets' });
    await logReminderEvent({
      mealPlanId: plan.id,
      plannerNotificationId: notification.id,
      userId: plan.user_id,
      channel: 'server_push',
      eventType: 'skipped_no_push_targets',
      dedupeKey: notification.dedupe_key,
    });
    return { status: 'skipped', reason: 'no_push_targets' };
  }

  try {
    const sendResult = await sendExpoReminderPushes(remoteTargets, plan, notification);
    if (sendResult.sentCount > 0) {
      await markNotificationTerminal(notification.id, 'sent', { sent: true });
      await markPlanNotificationSent(plan.id);
      await logReminderEvent({
        mealPlanId: plan.id,
        plannerNotificationId: notification.id,
        userId: plan.user_id,
        channel: 'server_push',
        eventType: 'sent',
        dedupeKey: notification.dedupe_key,
        metadata: sendResult,
      });
      return { status: 'sent', ...sendResult };
    }

    const errorMessage = sendResult.errors[0] || 'Expo push failed';
    if (Number(notification.retry_count || 0) + 1 >= MAX_RETRY_COUNT) {
      await markNotificationTerminal(notification.id, 'failed', { lastError: errorMessage });
      return { status: 'failed', error: errorMessage };
    }

    await markNotificationForRetry({ ...notification, planner_notification_id: notification.id }, errorMessage);
    return { status: 'retry', error: errorMessage };
  } catch (err) {
    const errorMessage = err?.message || 'Expo push failed';
    if (Number(notification.retry_count || 0) + 1 >= MAX_RETRY_COUNT) {
      await markNotificationTerminal(notification.id, 'failed', { lastError: errorMessage });
      await logReminderEvent({
        mealPlanId: plan.id,
        plannerNotificationId: notification.id,
        userId: plan.user_id,
        channel: 'server_push',
        eventType: 'failed',
        dedupeKey: notification.dedupe_key,
        metadata: { error: errorMessage },
      });
      return { status: 'failed', error: errorMessage };
    }

    await markNotificationForRetry({ ...notification, planner_notification_id: notification.id }, errorMessage);
    return { status: 'retry', error: errorMessage };
  }
}

async function processDuePlannerReminders({ limit = 50 } = {}) {
  const due = await claimDuePlannerNotifications(limit);
  const results = [];
  for (const notification of due) {
    results.push(await processPlannerNotification(notification));
  }
  return { claimed: due.length, results };
}

module.exports = {
  buildReminderPayload,
  logReminderEvent,
  syncPlannerNotificationForPlan,
  syncPlannerNotificationsForPlans,
  cancelPendingPlannerNotifications,
  registerReminderToken,
  acknowledgeLocalSchedule,
  processDuePlannerReminders,
};
