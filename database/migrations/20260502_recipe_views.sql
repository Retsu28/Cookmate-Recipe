-- Recipe Views tracking table
-- Records which user viewed which recipe and when.
-- A user may view the same recipe multiple times; we upsert on (user_id, recipe_id)
-- so the row always stores the most recent view timestamp.

CREATE TABLE IF NOT EXISTS recipe_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_views_user_recent
  ON recipe_views (user_id, viewed_at DESC);
