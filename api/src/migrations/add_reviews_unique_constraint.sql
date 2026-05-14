-- Add unique constraint on reviews(recipe_id, user_id) to enable upsert
-- This allows users to update their existing review instead of creating duplicates

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_recipe_user_unique'
    AND conrelid = 'reviews'::regclass
  ) THEN
    -- Add unique constraint
    ALTER TABLE reviews
    ADD CONSTRAINT reviews_recipe_user_unique
    UNIQUE (recipe_id, user_id);

    RAISE NOTICE 'Unique constraint reviews_recipe_user_unique added successfully.';
  ELSE
    RAISE NOTICE 'Constraint reviews_recipe_user_unique already exists.';
  END IF;
END $$;
