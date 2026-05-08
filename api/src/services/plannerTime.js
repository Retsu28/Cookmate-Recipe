const { DateTime } = require('luxon');

const PH_TIMEZONE = 'Asia/Manila';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const DEFAULT_MEAL_WINDOWS = {
  breakfast: { start_time: '07:00', end_time: '08:00' },
  lunch: { start_time: '11:00', end_time: '14:00' },
  dinner: { start_time: '18:00', end_time: '20:00' },
};

function normalizeMealType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return MEAL_TYPES.includes(normalized) ? normalized : null;
}

function normalizePlannedDate(value) {
  const candidate = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;

  const parsed = DateTime.fromISO(candidate, { zone: 'utc' });
  return parsed.isValid && parsed.toISODate() === candidate ? candidate : null;
}

function normalizeTime(value) {
  const candidate = String(value || '').trim();
  const match = candidate.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function normalizeTimezone(value) {
  const candidate = String(value || PH_TIMEZONE).trim();
  if (!candidate) return PH_TIMEZONE;
  return DateTime.now().setZone(candidate).isValid ? candidate : null;
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hour, minute] = normalized.split(':').map(Number);
  return hour * 60 + minute;
}

function isValidTimeWindow(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return start != null && end != null && start < end;
}

function getDefaultMealWindow(mealType) {
  const normalized = normalizeMealType(mealType) || 'dinner';
  return {
    ...DEFAULT_MEAL_WINDOWS[normalized],
    timezone: PH_TIMEZONE,
    reminder_enabled: true,
  };
}

function buildSchedule({ plannedDate, startTime, endTime, timezone = PH_TIMEZONE }) {
  const date = normalizePlannedDate(plannedDate);
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);
  const zone = normalizeTimezone(timezone);

  if (!date || !start || !end || !zone || !isValidTimeWindow(start, end)) {
    return null;
  }

  const scheduledStart = DateTime.fromFormat(`${date} ${start}`, 'yyyy-MM-dd HH:mm', { zone });
  const scheduledEnd = DateTime.fromFormat(`${date} ${end}`, 'yyyy-MM-dd HH:mm', { zone });
  if (!scheduledStart.isValid || !scheduledEnd.isValid || scheduledEnd <= scheduledStart) {
    return null;
  }

  return {
    planned_date: date,
    start_time: start,
    end_time: end,
    timezone: zone,
    scheduled_start_at: scheduledStart.toJSDate(),
    scheduled_end_at: scheduledEnd.toJSDate(),
  };
}

function formatTimeLabel(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return '';

  const [rawHour, minute] = normalized.split(':').map(Number);
  const suffix = rawHour >= 12 ? 'PM' : 'AM';
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function formatWindowLabel(startTime, endTime) {
  const start = formatTimeLabel(startTime);
  const end = formatTimeLabel(endTime);
  return start && end ? `${start} - ${end}` : '';
}

function buildDedupeKey(plan) {
  const scheduled = parseInstant(plan.scheduled_start_at).toUTC().toISO({
    suppressMilliseconds: false,
  });
  return `${plan.id}:${plan.reminder_version || 1}:${scheduled}`;
}

function parseInstant(value, zone = PH_TIMEZONE) {
  if (value instanceof Date) return DateTime.fromJSDate(value);
  if (DateTime.isDateTime(value)) return value;

  const text = String(value || '').trim();
  if (!text) return DateTime.invalid('missing datetime');

  let parsed = DateTime.fromISO(text, { setZone: true });
  if (parsed.isValid) return parsed;

  parsed = DateTime.fromSQL(text, { zone });
  return parsed.isValid ? parsed : DateTime.invalid('invalid datetime');
}

function getWindowStatus(plan, now = new Date()) {
  const start = parseInstant(plan.scheduled_start_at, plan.timezone);
  const end = parseInstant(plan.scheduled_end_at, plan.timezone);
  const current = parseInstant(now, plan.timezone);

  if (!start.isValid || !end.isValid || !current.isValid) {
    return {
      status: 'ended',
      seconds_until_start: 0,
      seconds_until_end: 0,
    };
  }

  if (current < start) {
    return {
      status: 'upcoming',
      seconds_until_start: Math.max(0, Math.floor(start.diff(current, 'seconds').seconds)),
      seconds_until_end: Math.max(0, Math.floor(end.diff(current, 'seconds').seconds)),
    };
  }

  if (current <= end) {
    return {
      status: 'active',
      seconds_until_start: 0,
      seconds_until_end: Math.max(0, Math.floor(end.diff(current, 'seconds').seconds)),
    };
  }

  return {
    status: 'ended',
    seconds_until_start: 0,
    seconds_until_end: 0,
  };
}

module.exports = {
  PH_TIMEZONE,
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  DEFAULT_MEAL_WINDOWS,
  normalizeMealType,
  normalizePlannedDate,
  normalizeTime,
  normalizeTimezone,
  isValidTimeWindow,
  getDefaultMealWindow,
  buildSchedule,
  buildDedupeKey,
  parseInstant,
  formatTimeLabel,
  formatWindowLabel,
  getWindowStatus,
};
