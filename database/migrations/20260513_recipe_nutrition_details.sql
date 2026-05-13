-- Add detailed nutrition fields per serving from filipino_recipes_nutrition.csv
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS)

BEGIN;

-- Add missing nutrition detail columns to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS serving_size VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sodium_mg INTEGER;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fiber_g DECIMAL;

COMMIT;
