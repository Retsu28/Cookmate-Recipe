const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { verifyAuthToken, AUTH_COOKIE_NAME } = require('../middleware/requireAuth');

function getOptionalUserId(req) {
  if (req.userId) return req.userId;

  const header = req.header('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return null;

  try {
    const payload = verifyAuthToken(token);
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

const HOME_COLS = `
  r.id, r.title, r.description, r.category, r.region_or_origin,
  r.difficulty, r.prep_time_minutes, r.cook_time_minutes,
  r.total_time_minutes, r.servings, r.calories, r.image_url,
  r.tags, r.is_featured, r.created_at
`.replace(/\s+/g, ' ').trim();

// ─── Sync recipe_ingredients join table ──────────────────────────────────────
// ingredients: [{ name }, ...]
async function syncRecipeIngredients(recipeId, ingredients) {
  if (!Array.isArray(ingredients)) return;

  // Remove existing links
  await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

  for (const ing of ingredients) {
    const name = (ing.name || '').trim();
    if (!name) continue;

    // Upsert into ingredients table
    const upsert = await pool.query(
      `INSERT INTO ingredients (name)
       VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name]
    );
    const ingredientId = upsert.rows[0].id;

    // Link to recipe
    await pool.query(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id)
       VALUES ($1, $2)
       ON CONFLICT (recipe_id, ingredient_id) DO NOTHING`,
      [recipeId, ingredientId]
    );
  }
}

// ─── Shared column list ──────────────────────────────────────────────────────
const RECIPE_COLS = `
  id, source_recipe_id, title, description, instructions,
  difficulty, prep_time_minutes, cook_time_minutes, total_time_minutes,
  servings, calories,
  region_or_origin, category, tags, normalized_ingredients,
  image_url, is_featured, is_published, author_id,
  created_at, updated_at
`.replace(/\s+/g, ' ').trim();

// ─── GET /api/recipes ────────────────────────────────────────────────────────
// Supports ?limit, ?offset, ?category, ?difficulty, ?search, ?featured, ?published, ?tag
exports.getAll = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const conditions = [];
    const params = [];
    const sort = String(req.query.sort || '').toLowerCase();

    if (req.query.category) {
      params.push(req.query.category);
      conditions.push(`category ILIKE $${params.length}`);
    }
    if (req.query.difficulty) {
      params.push(req.query.difficulty);
      conditions.push(`difficulty ILIKE $${params.length}`);
    }
    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      conditions.push(`(title ILIKE $${params.length} OR region_or_origin ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }
    if (req.query.featured === 'true') {
      conditions.push('is_featured = true');
    } else if (req.query.featured === 'false') {
      conditions.push('is_featured = false');
    }
    if (req.query.published === 'true') {
      conditions.push('is_published = true');
    } else if (req.query.published === 'false') {
      conditions.push('is_published = false');
    }
    if (req.query.tag) {
      params.push(req.query.tag);
      conditions.push(`$${params.length} = ANY(tags)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = sort === 'title_asc' || sort === 'az'
      ? 'ORDER BY LOWER(title) ASC, title ASC'
      : 'ORDER BY created_at DESC';

    // Total count for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM recipes ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes ${where}
       ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ recipes: result.rows, total, limit, offset });
  } catch (err) {
    console.error('[recipes/getAll]', err);
    res.status(500).json({ error: 'Failed to fetch recipes.' });
  }
};

// ─── GET /api/recipes/featured ───────────────────────────────────────────────
exports.getFeatured = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes
       WHERE is_featured = true AND is_published = true
       ORDER BY created_at DESC LIMIT 10`
    );
    // Fallback: if no featured recipes yet, return the newest 10
    if (result.rowCount === 0) {
      const fallback = await pool.query(
        `SELECT ${RECIPE_COLS} FROM recipes WHERE is_published = true ORDER BY created_at DESC LIMIT 10`
      );
      return res.json({ recipes: fallback.rows });
    }
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error('[recipes/getFeatured]', err);
    res.status(500).json({ error: 'Failed to fetch featured recipes.' });
  }
};

// ─── GET /api/recipes/recent ─────────────────────────────────────────────────
exports.getRecent = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes WHERE is_published = true ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error('[recipes/getRecent]', err);
    res.status(500).json({ error: 'Failed to fetch recent recipes.' });
  }
};

// ─── GET /api/recipes/categories ────────────────────────────────────────────
exports.getCategories = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) AS count, MAX(image_url) AS image_url FROM recipes
       WHERE category IS NOT NULL AND is_published = true
       GROUP BY category ORDER BY count DESC`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('[recipes/getCategories]', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

// ─── GET /api/recipes/home-sections ─────────────────────────────────────────
// Returns the 4 homepage sections in one response so web + mobile homepages
// can hydrate with a single round-trip.
//
// Optional query params:
//   ?limit=<n>     — per-section recipe limit (default 8, max 12).
// Recently Viewed is populated from the authenticated user's recipe_viewed
// history. It is empty when there is no authenticated user or no history.
exports.getHomeSections = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 12);
    const userId = getOptionalUserId(req);

    // Recipes are considered Filipino if region_or_origin is set (the seeded
    // data uses Luzon/Visayas/Bicol/etc.) or category/tags reference Filipino
    // cuisine explicitly. Falls back to all published recipes when empty.
    const FILIPINO_PREDICATE = `(
      r.region_or_origin IS NOT NULL
      OR LOWER(COALESCE(r.category, '')) LIKE '%filipin%'
      OR LOWER(COALESCE(r.category, '')) LIKE '%philippin%'
      OR EXISTS (
        SELECT 1 FROM unnest(COALESCE(r.tags, ARRAY[]::text[])) tg
        WHERE LOWER(tg) LIKE '%filipin%' OR LOWER(tg) LIKE '%philippin%'
      )
    )`;

    // Popularity score blends meal-plan usage, review activity, and the
    // featured flag so it works on a fresh database too.
    const POPULARITY_SCORE = `(
      COALESCE(mp_count, 0) * 3
      + COALESCE(review_count, 0) * 2
      + COALESCE(avg_rating, 0)
      + CASE WHEN r.is_featured THEN 5 ELSE 0 END
    )`;

    const POPULARITY_JOINS = `
      LEFT JOIN (
        SELECT recipe_id, COUNT(*)::int AS mp_count
        FROM meal_plans GROUP BY recipe_id
      ) mp ON mp.recipe_id = r.id
      LEFT JOIN (
        SELECT recipe_id, COUNT(*)::int AS review_count, AVG(rating)::float AS avg_rating
        FROM reviews GROUP BY recipe_id
      ) rv ON rv.recipe_id = r.id
    `;

    // 1) Categories — distinct categories with counts (for chips)
    const categoriesQ = pool.query(
      `SELECT category, COUNT(*)::int AS count, MAX(image_url) AS image_url
       FROM recipes
       WHERE category IS NOT NULL AND is_published = true
       GROUP BY category
       ORDER BY count DESC
       LIMIT 12`
    );

    // 2) Popular Filipino recipes
    const popularFilipinoQ = pool.query(
      `SELECT ${HOME_COLS}, ${POPULARITY_SCORE} AS popularity_score
       FROM recipes r
       ${POPULARITY_JOINS}
       WHERE r.is_published = true AND ${FILIPINO_PREDICATE}
       ORDER BY popularity_score DESC, r.is_featured DESC, r.created_at DESC
       LIMIT $1`,
      [limit]
    );

    // 3) Recently added recipes
    const recentQ = pool.query(
      `SELECT ${HOME_COLS}
       FROM recipes r
       WHERE r.is_published = true
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $1`,
      [limit]
    );

    // 4) Recently viewed — pulls only from recipe_viewed for the current user.
    //    The clients render "No recently viewed" when this is empty.
    let recentlyViewedRows = [];
    if (userId) {
      const recentlyViewedRes = await pool.query(
        `SELECT ${HOME_COLS}, rv.viewed_at
         FROM recipe_viewed rv
         JOIN recipes r ON r.id = rv.recipe_id
         WHERE rv.user_id = $1 AND r.is_published = true
         ORDER BY rv.viewed_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      recentlyViewedRows = recentlyViewedRes.rows;
    }

    const [categoriesRes, popularRes, recentRes] = await Promise.all([
      categoriesQ, popularFilipinoQ, recentQ,
    ]);

    let popularFilipinoRecipes = popularRes.rows;
    // Fallback: if no Filipino-tagged recipes yet, surface the top popular
    // recipes overall so the section is never blank.
    if (popularFilipinoRecipes.length === 0) {
      const fallback = await pool.query(
        `SELECT ${HOME_COLS}, ${POPULARITY_SCORE} AS popularity_score
         FROM recipes r
         ${POPULARITY_JOINS}
         WHERE r.is_published = true
         ORDER BY popularity_score DESC, r.created_at DESC
         LIMIT $1`,
        [limit]
      );
      popularFilipinoRecipes = fallback.rows;
    }

    res.json({
      categories: categoriesRes.rows,
      popularFilipinoRecipes,
      recentlyAddedRecipes: recentRes.rows,
      recentlyViewedRecipes: recentlyViewedRows,
    });
  } catch (err) {
    console.error('[recipes/getHomeSections]', err);
    res.status(500).json({ error: 'Failed to fetch home sections.' });
  }
};

// ─── GET /api/recipes/stats ─────────────────────────────────────────────────
// Admin: returns dashboard stats
exports.getStats = async (_req, res) => {
  try {
    const [totalR, publishedR, featuredR, catR, diffR, recentR, tagsR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM recipes'),
      pool.query('SELECT COUNT(*) FROM recipes WHERE is_published = true'),
      pool.query('SELECT COUNT(*) FROM recipes WHERE is_featured = true'),
      pool.query(`SELECT category, COUNT(*) AS count FROM recipes WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`),
      pool.query(`SELECT difficulty, COUNT(*) AS count FROM recipes WHERE difficulty IS NOT NULL GROUP BY difficulty ORDER BY count DESC`),
      pool.query(`SELECT ${RECIPE_COLS} FROM recipes ORDER BY created_at DESC LIMIT 5`),
      pool.query(`SELECT unnest(tags) AS tag, COUNT(*) AS count FROM recipes WHERE tags IS NOT NULL GROUP BY tag ORDER BY count DESC LIMIT 10`),
    ]);

    res.json({
      total: parseInt(totalR.rows[0].count),
      published: parseInt(publishedR.rows[0].count),
      featured: parseInt(featuredR.rows[0].count),
      categories: catR.rows,
      difficulties: diffR.rows,
      recentRecipes: recentR.rows,
      topTags: tagsR.rows,
    });
  } catch (err) {
    console.error('[recipes/getStats]', err);
    res.status(500).json({ error: 'Failed to fetch recipe stats.' });
  }
};

// ─── GET /api/recipes/:id ────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*,
              COALESCE(json_agg(json_build_object('id', i.id, 'name', i.name, 'quantity', ri.quantity, 'unit', ri.unit))
                       FILTER (WHERE i.id IS NOT NULL), '[]') AS ingredients
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       LEFT JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    console.error('[recipes/getById]', err);
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
};

// ─── POST /api/recipes ──────────────────────────────────────────────────────
// Admin creates a new recipe (for dashboard use)
exports.createRecipe = async (req, res) => {
  try {
    const {
      title, description, instructions,
      prep_time_minutes, cook_time_minutes, servings, calories,
      difficulty, region_or_origin, category, tags,
      normalized_ingredients, ingredients,
      image_url, is_featured, is_published,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Recipe title is required.' });
    }

    const prepTime = parseInt(prep_time_minutes) || null;
    const cookTime = parseInt(cook_time_minutes) || null;
    const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;

    const result = await pool.query(
      `INSERT INTO recipes (
          title, description, instructions,
          prep_time_minutes, cook_time_minutes, total_time_minutes,
          servings, calories,
          difficulty, region_or_origin, category, tags,
          normalized_ingredients,
          image_url, is_featured, is_published, author_id, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        title.trim(),
        description || null,
        Array.isArray(instructions) ? instructions : instructions ? [instructions] : null,
        prepTime,
        cookTime,
        totalTime,
        parseInt(servings) || null,
        parseInt(calories) || null,
        difficulty || null,
        region_or_origin || null,
        category || null,
        Array.isArray(tags) ? tags : tags ? tags.split(';').map(t => t.trim()).filter(Boolean) : null,
        Array.isArray(normalized_ingredients) ? normalized_ingredients : normalized_ingredients ? normalized_ingredients.split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : null,
        image_url || null,
        is_featured === true || is_featured === 'true' ? true : false,
        is_published !== false && is_published !== 'false' ? true : false,
        req.userId || null,
      ]
    );

    // Sync relational ingredients (recipe_ingredients join table)
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      await syncRecipeIngredients(result.rows[0].id, ingredients);
    }

    res.status(201).json({ recipe: result.rows[0] });
  } catch (err) {
    console.error('[recipes/createRecipe]', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A recipe with this title already exists.' });
    }
    res.status(500).json({ error: 'Failed to create recipe.' });
  }
};

// ─── PUT /api/recipes/:id ───────────────────────────────────────────────────
// Admin updates an existing recipe
exports.updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, instructions,
      prep_time_minutes, cook_time_minutes, servings, calories,
      difficulty, region_or_origin, category, tags,
      normalized_ingredients, ingredients,
      image_url, is_featured, is_published,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Recipe title is required.' });
    }

    const prepTime = parseInt(prep_time_minutes) || null;
    const cookTime = parseInt(cook_time_minutes) || null;
    const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;

    const result = await pool.query(
      `UPDATE recipes SET
          title = $1, description = $2, instructions = $3,
          prep_time_minutes = $4, cook_time_minutes = $5, total_time_minutes = $6,
          servings = $7, calories = $8,
          difficulty = $9, region_or_origin = $10, category = $11, tags = $12,
          normalized_ingredients = $13,
          image_url = $14, is_featured = $15, is_published = $16,
          updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [
        title.trim(),
        description || null,
        Array.isArray(instructions) ? instructions : instructions ? [instructions] : null,
        prepTime,
        cookTime,
        totalTime,
        parseInt(servings) || null,
        parseInt(calories) || null,
        difficulty || null,
        region_or_origin || null,
        category || null,
        Array.isArray(tags) ? tags : tags ? tags.split(';').map(t => t.trim()).filter(Boolean) : null,
        Array.isArray(normalized_ingredients) ? normalized_ingredients : normalized_ingredients ? normalized_ingredients.split(';').map(t => t.trim().toLowerCase()).filter(Boolean) : null,
        image_url || null,
        is_featured === true || is_featured === 'true' ? true : false,
        is_published !== false && is_published !== 'false' ? true : false,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }

    // Sync relational ingredients (recipe_ingredients join table)
    if (Array.isArray(ingredients)) {
      await syncRecipeIngredients(id, ingredients);
    }

    res.json({ recipe: result.rows[0] });
  } catch (err) {
    console.error('[recipes/updateRecipe]', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A recipe with this title already exists.' });
    }
    res.status(500).json({ error: 'Failed to update recipe.' });
  }
};

// ─── DELETE /api/recipes/:id ─────────────────────────────────────────────────
exports.deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id, title', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json({ message: 'Recipe deleted.', recipe: result.rows[0] });
  } catch (err) {
    console.error('[recipes/deleteRecipe]', err);
    res.status(500).json({ error: 'Failed to delete recipe.' });
  }
};

// ─── PATCH /api/recipes/:id/featured ─────────────────────────────────────────
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE recipes SET is_featured = NOT is_featured, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_featured`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    console.error('[recipes/toggleFeatured]', err);
    res.status(500).json({ error: 'Failed to toggle featured status.' });
  }
};

// ─── PATCH /api/recipes/:id/published ────────────────────────────────────────
exports.togglePublished = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE recipes SET is_published = NOT is_published, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_published`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    res.json({ recipe: result.rows[0] });
  } catch (err) {
    console.error('[recipes/togglePublished]', err);
    res.status(500).json({ error: 'Failed to toggle published status.' });
  }
};

// ─── POST /api/recipes/import-csv ────────────────────────────────────────────
// Admin: import recipes from uploaded CSV
// ─── POST /api/recipes/:id/view ─────────────────────────────────────────────
// Records that the authenticated user viewed a recipe. Upserts so repeated
// views just refresh the timestamp.
exports.recordView = async (req, res) => {
  try {
    const recipeId = Number(req.params.id);
    const userId = req.userId;

    if (!userId || !Number.isInteger(recipeId) || recipeId <= 0) {
      return res.status(400).json({ error: 'Authenticated user and recipeId are required.' });
    }

    await pool.query(
      `INSERT INTO recipe_viewed (user_id, recipe_id, viewed_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, recipe_id)
       DO UPDATE SET
         viewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, recipeId]
    );

    res.json({ success: true });
  } catch (err) {
    if (err?.code === '23503') {
      return res.status(404).json({ error: 'Recipe not found.' });
    }
    console.error('[recipes/recordView]', err);
    res.status(500).json({ error: 'Failed to record recipe view.' });
  }
};

// ─── GET /api/recipes/recently-viewed?limit=<n> ────────────────────────────
// Returns the recipes the user has recently viewed, ordered by most recent.
exports.getRecentlyViewed = async (req, res) => {
  try {
    const userId = getOptionalUserId(req);
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    if (!userId) {
      return res.json({ recipes: [] });
    }

    const result = await pool.query(
      `SELECT ${HOME_COLS}, rv.viewed_at
       FROM recipe_viewed rv
       JOIN recipes r ON r.id = rv.recipe_id
       WHERE rv.user_id = $1 AND r.is_published = true
       ORDER BY rv.viewed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ recipes: result.rows });
  } catch (err) {
    console.error('[recipes/getRecentlyViewed]', err);
    res.status(500).json({ error: 'Failed to fetch recently viewed recipes.' });
  }
};

exports.importCsv = async (req, res) => {
  try {
    const { parse } = require('csv-parse/sync');
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required.' });
    }

    const rows = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    let inserted = 0, updated = 0, skipped = 0;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const title = (row.recipe_name || '').trim();
        if (!title) { skipped++; continue; }

        const prepTime = parseInt(row.prep_time_minutes) || null;
        const cookTime = parseInt(row.cook_time_minutes) || null;
        const totalTime = (prepTime != null && cookTime != null) ? prepTime + cookTime : null;

        const instructionsArr = (row.instructions || '').split(/\.\s+(?=[A-Z])/).map(s => s.trim().replace(/\.+$/, '').trim()).filter(Boolean).map(s => s + '.');
        const tagsList = (row.tags || '').split(';').map(t => t.trim()).filter(Boolean);
        const normIngs = (row.normalized_ingredients || row.ingredients || '').split(';').map(s => s.trim().toLowerCase()).filter(Boolean);

        const result = await client.query(
          `INSERT INTO recipes (
              source_recipe_id, title, description, instructions,
              prep_time_minutes, cook_time_minutes, total_time_minutes,
              servings, calories, difficulty,
              region_or_origin, category, tags, normalized_ingredients,
              is_featured, is_published, updated_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,CURRENT_TIMESTAMP)
           ON CONFLICT ((LOWER(BTRIM(title))))
           DO UPDATE SET
              description = EXCLUDED.description,
              instructions = EXCLUDED.instructions,
              prep_time_minutes = EXCLUDED.prep_time_minutes,
              cook_time_minutes = EXCLUDED.cook_time_minutes,
              total_time_minutes = EXCLUDED.total_time_minutes,
              servings = EXCLUDED.servings,
              calories = EXCLUDED.calories,
              difficulty = EXCLUDED.difficulty,
              region_or_origin = EXCLUDED.region_or_origin,
              category = EXCLUDED.category,
              tags = EXCLUDED.tags,
              normalized_ingredients = EXCLUDED.normalized_ingredients,
              updated_at = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS was_inserted`,
          [
            (row.recipe_id || '').trim() || null,
            title,
            (row.instructions || '').trim() || null,
            instructionsArr.length ? instructionsArr : null,
            prepTime, cookTime, totalTime,
            parseInt(row.servings) || null,
            parseInt(row.calories_estimate) || null,
            (row.difficulty || '').trim() || null,
            (row.region_or_origin || '').trim() || null,
            (row.category || '').trim() || null,
            tagsList.length ? tagsList : null,
            normIngs.length ? normIngs : null,
            idx < 15,
          ]
        );

        if (result.rows[0].was_inserted) inserted++;
        else updated++;
      }

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({ message: 'CSV import completed.', inserted, updated, skipped, total: rows.length });
  } catch (err) {
    console.error('[recipes/importCsv]', err);
    res.status(500).json({ error: 'Failed to import CSV.' });
  }
};
