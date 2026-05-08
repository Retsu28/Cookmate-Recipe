-- Saves generated grocery lists per user so the planner can show them under "My Saves".
CREATE TABLE IF NOT EXISTS meal_planner_saved_grocery_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meal_planner_saved_grocery_lists_user
  ON meal_planner_saved_grocery_lists (user_id, created_at DESC);
