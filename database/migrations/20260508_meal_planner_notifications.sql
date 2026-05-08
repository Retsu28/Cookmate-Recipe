-- Real-time meal planner reminders and PH-time meal windows.
-- Extends the existing planner without replacing grocery-list behavior.

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS custom_time_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

UPDATE meal_plans
SET
  start_time = COALESCE(
    start_time,
    CASE LOWER(meal_type)
      WHEN 'breakfast' THEN TIME '07:00'
      WHEN 'lunch' THEN TIME '11:00'
      WHEN 'dinner' THEN TIME '18:00'
      ELSE TIME '18:00'
    END
  ),
  end_time = COALESCE(
    end_time,
    CASE LOWER(meal_type)
      WHEN 'breakfast' THEN TIME '08:00'
      WHEN 'lunch' THEN TIME '14:00'
      WHEN 'dinner' THEN TIME '20:00'
      ELSE TIME '20:00'
    END
  ),
  timezone = COALESCE(NULLIF(BTRIM(timezone), ''), 'Asia/Manila');

UPDATE meal_plans
SET
  scheduled_start_at = (planned_date::timestamp + start_time) AT TIME ZONE timezone,
  scheduled_end_at = (planned_date::timestamp + end_time) AT TIME ZONE timezone
WHERE scheduled_start_at IS NULL OR scheduled_end_at IS NULL;

ALTER TABLE meal_plans
  ALTER COLUMN start_time SET NOT NULL,
  ALTER COLUMN end_time SET NOT NULL,
  ALTER COLUMN scheduled_start_at SET NOT NULL,
  ALTER COLUMN scheduled_end_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_timezone_check'
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_timezone_check CHECK (BTRIM(timezone) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_time_window_check'
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_time_window_check CHECK (start_time < end_time);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_reminder_version_check'
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_reminder_version_check CHECK (reminder_version > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_scheduled_start
  ON meal_plans (user_id, scheduled_start_at);

CREATE INDEX IF NOT EXISTS idx_meal_plans_due_reminders
  ON meal_plans (scheduled_start_at)
  WHERE reminder_enabled = TRUE AND notification_sent = FALSE;

CREATE TABLE IF NOT EXISTS user_meal_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type VARCHAR(50) NOT NULL CHECK (LOWER(meal_type) IN ('breakfast', 'lunch', 'dinner')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila' CHECK (BTRIM(timezone) <> ''),
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_meal_preferences_time_window_check CHECK (start_time < end_time),
  UNIQUE (user_id, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_user_meal_preferences_user
  ON user_meal_preferences (user_id);

CREATE TABLE IF NOT EXISTS planner_notifications (
  id SERIAL PRIMARY KEY,
  meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL UNIQUE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped', 'missed', 'cancelled')),
  channel TEXT NOT NULL DEFAULT 'push',
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planner_notifications_due
  ON planner_notifications (status, scheduled_for, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_planner_notifications_plan
  ON planner_notifications (meal_plan_id, status);

CREATE TABLE IF NOT EXISTS planner_notification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  expo_push_token TEXT NOT NULL,
  permission_status TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, device_id),
  UNIQUE (expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_planner_notification_tokens_user_active
  ON planner_notification_tokens (user_id, is_active);

CREATE TABLE IF NOT EXISTS planner_device_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  reminder_version INTEGER NOT NULL,
  local_notification_id TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (meal_plan_id, device_id, reminder_version)
);

CREATE INDEX IF NOT EXISTS idx_planner_device_schedules_plan_device
  ON planner_device_schedules (meal_plan_id, device_id, reminder_version, is_active);

CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  meal_plan_id INTEGER REFERENCES meal_plans(id) ON DELETE SET NULL,
  planner_notification_id INTEGER REFERENCES planner_notifications(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  dedupe_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_user_recent
  ON reminder_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_dedupe
  ON reminder_logs (dedupe_key, event_type);
