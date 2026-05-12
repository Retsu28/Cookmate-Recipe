const { pool } = require('../config/db');

const ML_LOOKUP_CACHE_TTL_MS = Number(process.env.ML_LOOKUP_CACHE_TTL_MS || 5 * 60 * 1000);

const lookupCache = {
  recipes: { expiresAt: 0, rows: null },
  knownIngredients: { expiresAt: 0, rows: null },
};

async function getCachedPublishedRecipes() {
  const now = Date.now();
  if (lookupCache.recipes.rows && lookupCache.recipes.expiresAt > now) {
    return lookupCache.recipes.rows;
  }

  const result = await pool.query(
    `SELECT r.id, r.title, r.description, r.difficulty,
            r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes,
            r.servings, r.calories, r.region_or_origin, r.category,
            r.tags, r.normalized_ingredients, r.image_url, r.is_featured,
            COALESCE(
              array_agg(DISTINCT i.name ORDER BY i.name)
                FILTER (WHERE i.name IS NOT NULL),
              ARRAY[]::varchar[]
            ) AS linked_ingredients
     FROM recipes r
     LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     LEFT JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE r.is_published = true
     GROUP BY r.id
     ORDER BY r.is_featured DESC, r.created_at DESC
     LIMIT 300`
  );

  lookupCache.recipes = { rows: result.rows, expiresAt: now + ML_LOOKUP_CACHE_TTL_MS };
  return result.rows;
}

async function getCachedKnownIngredientRows() {
  const now = Date.now();
  if (lookupCache.knownIngredients.rows && lookupCache.knownIngredients.expiresAt > now) {
    return lookupCache.knownIngredients.rows;
  }

  const result = await pool.query(
    `SELECT DISTINCT name
     FROM (
       SELECT name::text AS name FROM ingredients WHERE name IS NOT NULL
       UNION
       SELECT unnest(normalized_ingredients)::text AS name
       FROM recipes WHERE normalized_ingredients IS NOT NULL
     ) known_ingredients
     WHERE NULLIF(TRIM(name), '') IS NOT NULL
     LIMIT 3000`
  );

  lookupCache.knownIngredients = { rows: result.rows, expiresAt: now + ML_LOOKUP_CACHE_TTL_MS };
  return result.rows;
}

module.exports = { getCachedPublishedRecipes, getCachedKnownIngredientRows };
