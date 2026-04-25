const { pool } = require('../config/db');

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
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
    const { userId } = req.params;
    const { full_name, bio, avatar_url, cooking_skill_level } = req.body;
    const result = await pool.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           cooking_skill_level = COALESCE($4, cooking_skill_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, full_name, avatar_url, bio, cooking_skill_level`,
      [full_name, bio, avatar_url, cooking_skill_level, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('[profile/updateProfile]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};
