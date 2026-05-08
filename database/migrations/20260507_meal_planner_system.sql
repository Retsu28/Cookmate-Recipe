-- Meal Planner production flow
-- Keeps the existing meal_plans table while standardizing meal_slot -> meal_type.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'meal_slot'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE meal_plans RENAME COLUMN meal_slot TO meal_type;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE meal_plans ADD COLUMN meal_type VARCHAR(50);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meal_plans'
      AND column_name = 'meal_slot'
  ) THEN
    UPDATE meal_plans
    SET meal_type = COALESCE(NULLIF(BTRIM(meal_type), ''), meal_slot)
    WHERE meal_type IS NULL OR BTRIM(meal_type) = '';
  END IF;
END $$;

UPDATE meal_plans
SET meal_type = LOWER(COALESCE(NULLIF(BTRIM(meal_type), ''), 'dinner'));

UPDATE meal_plans
SET meal_type = 'dinner'
WHERE LOWER(meal_type) NOT IN ('breakfast', 'lunch', 'dinner');

ALTER TABLE meal_plans
  ALTER COLUMN meal_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meal_plans_meal_type_check'
  ) THEN
    ALTER TABLE meal_plans
      ADD CONSTRAINT meal_plans_meal_type_check
      CHECK (LOWER(meal_type) IN ('breakfast', 'lunch', 'dinner'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date
  ON meal_plans (user_id, planned_date, meal_type);

CREATE TABLE IF NOT EXISTS meal_planner_grocery_generations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meal_planner_grocery_generations_user_recent
  ON meal_planner_grocery_generations (user_id, generated_at DESC);
