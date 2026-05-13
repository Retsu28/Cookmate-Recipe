-- Migration: Create saved_recipes table for user favorites
-- Created: May 13, 2026

-- Create saved_recipes table
CREATE TABLE IF NOT EXISTS saved_recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON saved_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_saved_at ON saved_recipes(saved_at DESC);

-- Add comments for documentation
COMMENT ON TABLE saved_recipes IS 'Stores user saved/favorited recipes';
COMMENT ON COLUMN saved_recipes.user_id IS 'ID of the user who saved the recipe';
COMMENT ON COLUMN saved_recipes.recipe_id IS 'ID of the saved recipe';
COMMENT ON COLUMN saved_recipes.saved_at IS 'Timestamp when the recipe was saved';
