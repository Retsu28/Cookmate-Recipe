const { pool } = require('../config/db');

exports.findByUser = async (userId, { limit = 50, offset = 0 } = {}) => {
  const result = await pool.query(
    `SELECT id, user_id, title, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

exports.countUnread = async (userId) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return result.rows[0].count;
};

exports.markAsRead = async (id, userId) => {
  const result = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rowCount > 0;
};

exports.markAllAsRead = async (userId) => {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
};

exports.delete = async (id, userId) => {
  const result = await pool.query(
    'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rowCount > 0;
};

exports.create = async ({ userId, title, message, type = 'General' }) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read)
     VALUES ($1, $2, $3, $4, FALSE) RETURNING id`,
    [userId, title, message, type]
  );
  return result.rows[0];
};

exports.createBulk = async (notifications) => {
  const promises = notifications.map(n =>
    pool.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES ($1, $2, $3, $4, FALSE)`,
      [n.userId, n.title, n.message, n.type || 'General']
    )
  );
  await Promise.allSettled(promises);
};
