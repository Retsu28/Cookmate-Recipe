-- Add CSV-compatible fields to the recipes table.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Run after database/schema.sql has created the recipes table.

BEGIN;

-- ─── Add missing columns to recipes ───────────────────────────────────────────
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS region_or_origin VARCHAR(100);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category        VARCHAR(100);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags            TEXT[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_featured     BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ─── Add a unique constraint on recipe title to support idempotent seeding ────
-- This allows ON CONFLICT (title) to work for upserts.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'recipes_title_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX recipes_title_unique_idx ON recipes (LOWER(BTRIM(title)));
    END IF;
END $$;

-- ─── Make recipe_ingredients.quantity nullable for CSV imports ─────────────────
-- The CSV provides ingredient names without structured quantity/unit data.
ALTER TABLE recipe_ingredients ALTER COLUMN quantity DROP NOT NULL;

COMMIT;
