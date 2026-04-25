const { pool } = require('../config/db');

exports.generate = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT sl.id, i.name AS ingredient_name, sl.quantity, sl.unit, sl.is_purchased
       FROM shopping_lists sl
       LEFT JOIN ingredients i ON i.id = sl.ingredient_id
       WHERE sl.user_id = $1
       ORDER BY sl.created_at DESC`,
      [userId]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('[shoppingList/generate]', err);
    res.status(500).json({ error: 'Failed to generate shopping list.' });
  }
};
