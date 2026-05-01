-- Add remaining fields for full CSV support + admin management.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Run after 20260426_recipes_csv_fields.sql

BEGIN;

-- source_recipe_id: stores the original recipe_id from CSV (e.g. R001)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_recipe_id VARCHAR(50);

-- normalized_ingredients: TEXT[] for ingredient-based search/matching
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS normalized_ingredients TEXT[];

-- total_time_minutes: computed prep + cook
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER;

-- is_published: controls visibility on user-facing pages
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

-- Unique index on source_recipe_id for upsert by CSV recipe_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'recipes_source_recipe_id_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX recipes_source_recipe_id_unique_idx ON recipes (source_recipe_id) WHERE source_recipe_id IS NOT NULL;
    END IF;
END $$;

COMMIT;
