-- Canonical recipe view history table.
-- Keeps one row per user/recipe and refreshes viewed_at on repeat views.

CREATE TABLE IF NOT EXISTS recipe_viewed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_viewed_user_recent
  ON recipe_viewed (user_id, viewed_at DESC);

DO $$
BEGIN
  IF to_regclass('public.recipe_views') IS NOT NULL THEN
    EXECUTE $backfill$
      INSERT INTO recipe_viewed (user_id, recipe_id, viewed_at, created_at, updated_at)
      SELECT
        user_id,
        recipe_id,
        COALESCE(viewed_at, CURRENT_TIMESTAMP),
        COALESCE(viewed_at, CURRENT_TIMESTAMP),
        COALESCE(viewed_at, CURRENT_TIMESTAMP)
      FROM recipe_views
      ON CONFLICT (user_id, recipe_id)
      DO UPDATE SET
        viewed_at = GREATEST(recipe_viewed.viewed_at, EXCLUDED.viewed_at),
        updated_at = CURRENT_TIMESTAMP
    $backfill$;
  END IF;
END $$;
