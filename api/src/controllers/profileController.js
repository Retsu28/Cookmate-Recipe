const { pool } = require('../config/db');

function normalizeFullName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function getRequestedUserId(rawUserId) {
  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function canAccessProfile(req, requestedUserId) {
  return req.userRole === 'admin' || req.userId === requestedUserId;
}

exports.getProfile = async (req, res) => {
  try {
    const userId = getRequestedUserId(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (!canAccessProfile(req, userId)) {
      return res.status(403).json({ error: 'You can only view your own profile.' });
    }

    const result = await pool.query(
      `SELECT id, email, full_name, avatar_url, bio, cooking_skill_level, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('[profile/getProfile]', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = getRequestedUserId(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (!canAccessProfile(req, userId)) {
      return res.status(403).json({ error: 'You can only update your own profile.' });
    }

    const { full_name, bio, avatar_url, cooking_skill_level } = req.body ?? {};
    const nextFullName = typeof full_name === 'string' ? normalizeFullName(full_name) : null;

    if (typeof full_name === 'string' && !nextFullName) {
      return res.status(400).json({ error: 'Full name cannot be blank.' });
    }

    if (nextFullName) {
      const duplicate = await pool.query(
        `SELECT 1
         FROM users
         WHERE id <> $1
           AND LOWER(BTRIM(full_name)) = LOWER(BTRIM($2))
         LIMIT 1`,
        [userId, nextFullName]
      );

      if (duplicate.rowCount > 0) {
        return res.status(409).json({ error: 'An account with this full name already exists.' });
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           cooking_skill_level = COALESCE($4, cooking_skill_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, full_name, avatar_url, bio, cooking_skill_level`,
      [nextFullName, bio, avatar_url, cooking_skill_level, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'An account with this full name already exists.' });
    }
    console.error('[profile/updateProfile]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};
