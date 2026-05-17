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

exports.getPlannerStates = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const result = await pool.query(
      `SELECT ref_type, ref_id, is_read, is_deleted
       FROM planner_notification_states
       WHERE user_id = $1`,
      [userId]
    );
    res.json({ states: result.rows });
  } catch (err) {
    logger.error('[notifications/getPlannerStates]', err);
    res.status(500).json({ error: 'Failed to fetch planner notification states.' });
  }
};

exports.upsertPlannerState = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const { ref_type, ref_id, is_read, is_deleted } = req.body;
    if (!ref_type || ref_id === undefined) {
      return res.status(400).json({ error: 'ref_type and ref_id are required.' });
    }

    await pool.query(
      `INSERT INTO planner_notification_states (user_id, ref_type, ref_id, is_read, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, ref_type, ref_id)
       DO UPDATE SET
         is_read    = COALESCE(EXCLUDED.is_read, planner_notification_states.is_read),
         is_deleted = COALESCE(EXCLUDED.is_deleted, planner_notification_states.is_deleted),
         updated_at = NOW()`,
      [userId, ref_type, ref_id, is_read ?? false, is_deleted ?? false]
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('[notifications/upsertPlannerState]', err);
    res.status(500).json({ error: 'Failed to update planner notification state.' });
  }
};

