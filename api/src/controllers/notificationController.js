const { pool } = require('../config/db');

exports.getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('[notifications/getByUser]', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};
