const { pool } = require('../config/db');
const logger = require('../config/logger');

const ALLOWED_SETTINGS_KEYS = new Set(['notifications', 'appearance', 'privacy']);

function getRequestedUserId(rawUserId) {
  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function canAccessSettings(req, requestedUserId) {
  return req.userRole === 'admin' || req.userId === requestedUserId;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateRequest(req, res) {
  const userId = getRequestedUserId(req.params.userId);
  if (!userId) {
    res.status(400).json({ error: 'Invalid user id.' });
    return null;
  }

  if (!canAccessSettings(req, userId)) {
    res.status(403).json({ error: 'You can only manage your own settings.' });
    return null;
  }

  const key = String(req.params.key || '').trim();
  if (!ALLOWED_SETTINGS_KEYS.has(key)) {
    res.status(400).json({ error: 'Invalid settings key.' });
    return null;
  }

  return { userId, key };
}

exports.getSettings = async (req, res) => {
  try {
    const validated = validateRequest(req, res);
    if (!validated) return;

    const result = await pool.query(
      `SELECT settings_value
       FROM public.user_settings
       WHERE user_id = $1 AND settings_key = $2
       LIMIT 1`,
      [validated.userId, validated.key]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({});
    }

    res.status(200).json({ value: result.rows[0].settings_value });
  } catch (err) {
    logger.error('[settings/getSettings]', err);
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
};

exports.saveSettings = async (req, res) => {
  try {
    const validated = validateRequest(req, res);
    if (!validated) return;

    const { value } = req.body ?? {};
    if (!isPlainObject(value)) {
      return res.status(400).json({ error: 'Settings value must be an object.' });
    }

    const result = await pool.query(
      `INSERT INTO public.user_settings (user_id, settings_key, settings_value, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id, settings_key)
       DO UPDATE SET settings_value = EXCLUDED.settings_value, updated_at = NOW()
       RETURNING settings_value`,
      [validated.userId, validated.key, JSON.stringify(value)]
    );

    res.status(200).json({ value: result.rows[0].settings_value });
  } catch (err) {
    logger.error('[settings/saveSettings]', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
};

