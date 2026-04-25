const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

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

    const {
      email,
      full_name,
      bio,
      avatar_url,
      cooking_skill_level,
      current_password,
      new_password,
    } = req.body ?? {};

    const existing = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const currentUser = existing.rows[0];

    const nextEmail = typeof email === 'string' ? normalizeEmail(email) : null;
    const nextFullName = typeof full_name === 'string' ? normalizeFullName(full_name) : null;
    const nextBio = typeof bio === 'string' ? bio.trim() : null;
    const nextAvatarUrl = typeof avatar_url === 'string' ? avatar_url.trim() : null;
    const nextCookingSkillLevel =
      typeof cooking_skill_level === 'string' && cooking_skill_level.trim()
        ? cooking_skill_level.trim()
        : null;
    const nextPassword =
      typeof new_password === 'string' && new_password.length > 0 ? new_password : null;
    const emailChanging =
      !!nextEmail && nextEmail !== normalizeEmail(currentUser.email);
    const passwordChanging = !!nextPassword;

    if (typeof full_name === 'string' && !nextFullName) {
      return res.status(400).json({ error: 'Full name cannot be blank.' });
    }
    if (typeof email === 'string' && !EMAIL_RE.test(nextEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (passwordChanging && nextPassword.length < MIN_PASSWORD_LEN) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` });
    }
    const hasCurrentPassword =
      typeof current_password === 'string' && current_password.length > 0;

    if ((emailChanging || passwordChanging) && !hasCurrentPassword) {
      return res
        .status(400)
        .json({ error: 'Current password is required to update your email or password.' });
    }
    if (emailChanging || passwordChanging) {
      const passwordOk = await bcrypt.compare(current_password, currentUser.password_hash);
      if (!passwordOk) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
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
    if (emailChanging) {
      const duplicate = await pool.query(
        `SELECT 1
         FROM users
         WHERE id <> $1
           AND LOWER(BTRIM(email)) = $2
         LIMIT 1`,
        [userId, nextEmail]
      );

      if (duplicate.rowCount > 0) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
    }

    const nextPasswordHash = passwordChanging
      ? await bcrypt.hash(nextPassword, BCRYPT_ROUNDS)
      : null;

    const result = await pool.query(
      `UPDATE users
       SET email = COALESCE($1, email),
           password_hash = COALESCE($2, password_hash),
           full_name = COALESCE($3, full_name),
           bio = COALESCE($4, bio),
           avatar_url = COALESCE($5, avatar_url),
           cooking_skill_level = COALESCE($6, cooking_skill_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, email, full_name, avatar_url, bio, cooking_skill_level`,
      [
        nextEmail,
        nextPasswordHash,
        nextFullName,
        nextBio,
        nextAvatarUrl,
        nextCookingSkillLevel,
        userId,
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    if (err?.code === '23505') {
      return res
        .status(409)
        .json({ error: 'An account with this email or full name already exists.' });
    }
    console.error('[profile/updateProfile]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};
