const { pool } = require('../config/db');

exports.getAll = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, category, image_url FROM ingredients ORDER BY name'
    );
    res.json({ ingredients: result.rows });
  } catch (err) {
    console.error('[ingredients/getAll]', err);
    res.status(500).json({ error: 'Failed to fetch ingredients.' });
  }
};
