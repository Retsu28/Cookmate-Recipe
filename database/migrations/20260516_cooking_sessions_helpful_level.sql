-- Migration: cooking sessions tracking + 3-level helpfulness vote
-- 2026-05-16

-- Track which user completed cooking which recipe
CREATE TABLE IF NOT EXISTS recipe_cooking_sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_cooking_sessions_user ON recipe_cooking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_recipe ON recipe_cooking_sessions(recipe_id);

-- Add 3-level helpfulness: 0 = not helpful, 1 = helpful, 2 = very helpful
-- Keep is_helpful for backwards compatibility, add helpfulness_level
ALTER TABLE review_helpfulness
  ADD COLUMN IF NOT EXISTS helpfulness_level SMALLINT NOT NULL DEFAULT 1
    CHECK (helpfulness_level IN (0, 1, 2));

-- Backfill: map old boolean is_helpful → helpfulness_level
UPDATE review_helpfulness SET helpfulness_level = 1 WHERE is_helpful = true  AND helpfulness_level = 1;
UPDATE review_helpfulness SET helpfulness_level = 0 WHERE is_helpful = false AND helpfulness_level = 1;
