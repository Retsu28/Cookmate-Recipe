-- Performance indexes for recipe search and popularity queries.
--
-- 1. pg_trgm GIN index on recipes(title, category) — makes ILIKE '%...%'
--    search ~10-100x faster at scale instead of a full table scan.
--
-- 2. Index on reviews(recipe_id) — the home-sections popularity JOIN
--    (COUNT(*) / AVG(rating) GROUP BY recipe_id) currently scans the
--    whole reviews table; this index makes it an index scan.
--
-- 3. Index on meal_plans(recipe_id) — same reason as reviews: the
--    popularity JOIN aggregates meal_plans by recipe_id without an index.
--
-- 4. reviews(user_id) — used when fetching a user's own reviews on
--    the profile / recipe-detail pages.
--
-- Safe to run on a live database; all statements use IF NOT EXISTS.

-- Enable trigram extension (required for GIN trgm indexes).
-- Requires superuser or pg_extension_owner. No-op if already installed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for fast ILIKE search on recipe title
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm
  ON recipes USING GIN (title gin_trgm_ops);

-- Trigram index for fast ILIKE search on recipe category
CREATE INDEX IF NOT EXISTS idx_recipes_category_trgm
  ON recipes USING GIN (category gin_trgm_ops);

-- Index for popularity JOIN: reviews aggregated by recipe
CREATE INDEX IF NOT EXISTS idx_reviews_recipe_id
  ON reviews (recipe_id);

-- Index for per-user review lookup (profile / recipe-detail)
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews (user_id);

-- Index for popularity JOIN: meal_plans aggregated by recipe
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id
  ON meal_plans (recipe_id);
