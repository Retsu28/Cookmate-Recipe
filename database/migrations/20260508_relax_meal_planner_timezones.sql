-- Allow Luxon-validated IANA timezones instead of locking planner windows to Asia/Manila.

ALTER TABLE meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_timezone_check,
  ADD CONSTRAINT meal_plans_timezone_check CHECK (BTRIM(timezone) <> '');

ALTER TABLE user_meal_preferences
  DROP CONSTRAINT IF EXISTS user_meal_preferences_timezone_check,
  ADD CONSTRAINT user_meal_preferences_timezone_check CHECK (BTRIM(timezone) <> '');
