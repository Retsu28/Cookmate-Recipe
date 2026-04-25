const { pool } = require('../config/db');

exports.getInventory = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT ki.id, i.name AS ingredient_name, ki.quantity, ki.unit, ki.expiry_date
       FROM kitchen_inventory ki
       LEFT JOIN ingredients i ON i.id = ki.ingredient_id
       WHERE ki.user_id = $1
       ORDER BY ki.expiry_date ASC`,
      [userId]
    );
    res.json({ inventory: result.rows });
  } catch (err) {
    console.error('[inventory/getInventory]', err);
    res.status(500).json({ error: 'Failed to fetch inventory.' });
  }
};
