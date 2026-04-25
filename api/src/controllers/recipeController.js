const { pool } = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, difficulty, prep_time_minutes, cook_time_minutes, servings, calories, image_url, author_id, created_at FROM recipes ORDER BY created_at DESC'
    );
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error('[recipes/getAll]', err);
    res.status(500).json({ error: 'Failed to fetch recipes.' });
  }
};

exports.getFeatured = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, difficulty, prep_time_minutes, cook_time_minutes, servings, calories, image_url, author_id, created_at FROM recipes ORDER BY created_at DESC LIMIT 10'
    );
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error('[recipes/getFeatured]', err);
    res.status(500).json({ error: 'Failed to fetch featured recipes.' });
  }
};

exports.getRecent = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, difficulty, prep_time_minutes, cook_time_minutes, servings, calories, image_url, author_id, created_at FROM recipes ORDER BY created_at DESC LIMIT 20'
    );
    res.json({ recipes: result.rows });
  } catch (err) {
    console.error('[recipes/getRecent]', err);
    res.status(500).json({ error: 'Failed to fetch recent recipes.' });
  }
};

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
