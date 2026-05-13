const { pool } = require('../config/db');
const logger = require('../config/logger');
const { writeAuditLog } = require('../middleware/auditLog');

exports.getAll = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.name, i.category, i.image_url,
              COUNT(ri.recipe_id)::int AS used_in_recipes
       FROM ingredients i
       LEFT JOIN recipe_ingredients ri ON ri.ingredient_id = i.id
       GROUP BY i.id
       ORDER BY i.name`
    );
    res.json({ ingredients: result.rows });
  } catch (err) {
    logger.error('[ingredients/getAll]', err);
    res.status(500).json({ error: 'Failed to fetch ingredients.' });
  }
};

exports.create = async (req, res) => {
  const { name, category, image_url } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Ingredient name is required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO ingredients (name, category, image_url)
       VALUES ($1, $2, $3)
       RETURNING id, name, category, image_url`,
      [name.trim(), category?.trim() || null, image_url?.trim() || null]
    );
    await writeAuditLog(req, { entityId: result.rows[0].id, metadata: { name: result.rows[0].name } });
    res.status(201).json({ ingredient: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An ingredient with that name already exists.' });
    }
    logger.error('[ingredients/create]', err);
    res.status(500).json({ error: 'Failed to create ingredient.' });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, category, image_url } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ingredients
       SET name      = COALESCE($1, name),
           category  = COALESCE($2, category),
           image_url = COALESCE($3, image_url)
       WHERE id = $4
       RETURNING id, name, category, image_url`,
      [name?.trim() || null, category?.trim() || null, image_url?.trim() || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ingredient not found.' });
    await writeAuditLog(req, { metadata: { name: result.rows[0].name } });
    res.json({ ingredient: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An ingredient with that name already exists.' });
    }
    logger.error('[ingredients/update]', err);
    res.status(500).json({ error: 'Failed to update ingredient.' });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM ingredients WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ingredient not found.' });
    await writeAuditLog(req);
    res.json({ success: true });
  } catch (err) {
    logger.error('[ingredients/delete]', err);
    res.status(500).json({ error: 'Failed to delete ingredient.' });
  }
};
