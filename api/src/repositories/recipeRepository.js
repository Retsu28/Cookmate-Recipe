const { pool } = require('../config/db');

const RECIPE_COLS = `
  id, source_recipe_id, title, description, instructions,
  difficulty, prep_time_minutes, cook_time_minutes, total_time_minutes,
  servings, serving_size, calories, protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
  region_or_origin, category, tags, normalized_ingredients,
  image_url, is_featured, is_published, author_id,
  video_filename, instruction_timestamps, video_credits,
  created_at, updated_at
`.replace(/\s+/g, ' ').trim();

const HOME_COLS = `
  r.id, r.title, r.description, r.category, r.region_or_origin,
  r.difficulty, r.prep_time_minutes, r.cook_time_minutes,
  r.total_time_minutes, r.servings, r.calories, r.image_url,
  r.tags, r.is_featured, r.created_at
`.replace(/\s+/g, ' ').trim();

exports.RECIPE_COLS = RECIPE_COLS;
exports.HOME_COLS = HOME_COLS;

exports.findAll = async ({ conditions, params, orderBy, limit, offset }) => {
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allParams = [...params, limit, offset];
  const countResult = await pool.query(`SELECT COUNT(*) FROM recipes ${where}`, params);
  const total = parseInt(countResult.rows[0].count);
  const result = await pool.query(
    `SELECT ${RECIPE_COLS} FROM recipes ${where} ${orderBy} LIMIT $${allParams.length - 1} OFFSET $${allParams.length}`,
    allParams
  );
  return { recipes: result.rows, total };
};

exports.findFeatured = async (limit = 15) => {
  const result = await pool.query(
    `SELECT ${RECIPE_COLS} FROM recipes
     WHERE is_featured = true AND is_published = true
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  if (result.rowCount === 0) {
    const fallback = await pool.query(
      `SELECT ${RECIPE_COLS} FROM recipes WHERE is_published = true ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return fallback.rows;
  }
  return result.rows;
};

exports.findRecent = async (limit = 20) => {
  const result = await pool.query(
    `SELECT ${RECIPE_COLS} FROM recipes WHERE is_published = true ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

exports.findById = async (id) => {
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
  return result.rows[0] || null;
};

exports.existsPublished = async (id) => {
  const result = await pool.query(
    `SELECT id FROM recipes WHERE id = $1 AND is_published = true`,
    [id]
  );
  return result.rowCount > 0;
};

exports.create = async (params) => {
  const result = await pool.query(
    `INSERT INTO recipes (
        title, description, instructions,
        prep_time_minutes, cook_time_minutes, total_time_minutes,
        servings, serving_size, calories, protein_g, carbs_g, fat_g, sodium_mg, fiber_g,
        difficulty, region_or_origin, category, tags,
        normalized_ingredients,
        image_url, is_featured, is_published, author_id, updated_at,
        video_filename, instruction_timestamps, video_credits
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,CURRENT_TIMESTAMP,$24,$25,$26)
     RETURNING *`,
    params
  );
  return result.rows[0];
};

exports.update = async (updates, params) => {
  const result = await pool.query(
    `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return result.rows[0] || null;
};

exports.delete = async (id) => {
  const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id, title', [id]);
  return result.rows[0] || null;
};

exports.getVideoFilename = async (id) => {
  const result = await pool.query('SELECT video_filename FROM recipes WHERE id = $1', [id]);
  return result.rows[0]?.video_filename || null;
};

exports.isFeatured = async (id) => {
  const result = await pool.query('SELECT is_featured FROM recipes WHERE id = $1', [id]);
  return result.rows[0] || null;
};

exports.countFeatured = async () => {
  const result = await pool.query('SELECT COUNT(*) FROM recipes WHERE is_featured = true');
  return parseInt(result.rows[0].count, 10);
};

exports.toggleFeatured = async (id) => {
  const result = await pool.query(
    `UPDATE recipes SET is_featured = NOT is_featured, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_featured`,
    [id]
  );
  return result.rows[0] || null;
};

exports.togglePublished = async (id) => {
  const result = await pool.query(
    `UPDATE recipes SET is_published = NOT is_published, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_published`,
    [id]
  );
  return result.rows[0] || null;
};

exports.getCategories = async () => {
  const result = await pool.query(
    `SELECT category, COUNT(*) AS count, MAX(image_url) AS image_url FROM recipes
     WHERE category IS NOT NULL AND is_published = true
     GROUP BY category ORDER BY count DESC`
  );
  return result.rows;
};

exports.syncIngredients = async (recipeId, ingredients) => {
  if (!Array.isArray(ingredients)) return;
  await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
  for (const ing of ingredients) {
    const name = (ing.name || '').trim();
    if (!name) continue;
    const upsert = await pool.query(
      `INSERT INTO ingredients (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [name]
    );
    await pool.query(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES ($1, $2) ON CONFLICT (recipe_id, ingredient_id) DO NOTHING`,
      [recipeId, upsert.rows[0].id]
    );
  }
};

exports.getStats = async () => {
  const [totalR, publishedR, featuredR, catR, diffR, recentR, tagsR] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM recipes'),
    pool.query('SELECT COUNT(*) FROM recipes WHERE is_published = true'),
    pool.query('SELECT COUNT(*) FROM recipes WHERE is_featured = true'),
    pool.query(`SELECT category, COUNT(*) AS count FROM recipes WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`),
    pool.query(`SELECT difficulty, COUNT(*) AS count FROM recipes WHERE difficulty IS NOT NULL GROUP BY difficulty ORDER BY count DESC`),
    pool.query(`SELECT ${RECIPE_COLS} FROM recipes ORDER BY created_at DESC LIMIT 5`),
    pool.query(`SELECT unnest(tags) AS tag, COUNT(*) AS count FROM recipes WHERE tags IS NOT NULL GROUP BY tag ORDER BY count DESC LIMIT 10`),
  ]);
  return {
    total: parseInt(totalR.rows[0].count),
    published: parseInt(publishedR.rows[0].count),
    featured: parseInt(featuredR.rows[0].count),
    categories: catR.rows,
    difficulties: diffR.rows,
    recentRecipes: recentR.rows,
    topTags: tagsR.rows,
  };
};
