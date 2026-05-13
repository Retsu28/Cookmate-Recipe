const { pool } = require('../config/db');
const logger = require('../config/logger');

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
    logger.error('[notifications/getByUser]', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, message, type, is_read, created_at`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ notification: result.rows[0] });
  } catch (err) {
    logger.error('[notifications/markAsRead]', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId]
    );

    res.json({ markedAsRead: result.rowCount });
  } catch (err) {
    logger.error('[notifications/markAllAsRead]', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('[notifications/deleteNotification]', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
};

