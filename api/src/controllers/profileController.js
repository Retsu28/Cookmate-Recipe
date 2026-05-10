const bcrypt = require('bcryptjs');
const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../config/db');
const { AUTH_COOKIE_NAME } = require('../middleware/requireAuth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;
const AVATAR_UPLOAD_DIR = path.resolve(__dirname, '..', '..', '..', 'uploads', 'avatars');
const AVATAR_PUBLIC_PREFIX = '/uploads/avatars/';
const AVATAR_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

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

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function localAvatarPathFromUrl(avatarUrl) {
  if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith(AVATAR_PUBLIC_PREFIX)) {
    return null;
  }
  const filename = path.basename(avatarUrl);
  if (!filename || filename !== avatarUrl.slice(AVATAR_PUBLIC_PREFIX.length)) {
    return null;
  }
  return path.join(AVATAR_UPLOAD_DIR, filename);
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
        .json({ error: 'An account with this email already exists.' });
    }
    console.error('[profile/updateProfile]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

exports.uploadAvatar = async (req, res) => {
  let savedFilePath = null;

  try {
    const userId = getRequestedUserId(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (!canAccessProfile(req, userId)) {
      return res.status(403).json({ error: 'You can only update your own profile.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Avatar image is required.' });
    }

    const ext = AVATAR_EXT_BY_MIME[req.file.mimetype];
    if (!ext) {
      return res.status(400).json({ error: 'Please upload a JPEG, PNG, or WebP image.' });
    }

    const existing = await pool.query(
      'SELECT id, avatar_url FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
    const filename = `${userId}-${Date.now()}${ext}`;
    savedFilePath = path.join(AVATAR_UPLOAD_DIR, filename);
    await fs.writeFile(savedFilePath, req.file.buffer);

    const avatarUrl = `${AVATAR_PUBLIC_PREFIX}${filename}`;
    await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [avatarUrl, userId]
    );

    const previousPath = localAvatarPathFromUrl(existing.rows[0].avatar_url);
    if (previousPath && previousPath !== savedFilePath) {
      await fs.unlink(previousPath).catch(() => {});
    }

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    if (savedFilePath) {
      await fs.unlink(savedFilePath).catch(() => {});
    }
    console.error('[profile/uploadAvatar]', err);
    res.status(500).json({ error: 'Failed to upload avatar.' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = getRequestedUserId(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (!canAccessProfile(req, userId)) {
      return res.status(403).json({ error: 'You can only delete your own account.' });
    }

    const { current_password } = req.body ?? {};
    if (typeof current_password !== 'string' || current_password.length === 0) {
      return res.status(400).json({ error: 'Current password is required' });
    }

    const existing = await pool.query(
      'SELECT id, password_hash FROM public.users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = existing.rows[0].password_hash;
    const passwordOk =
      typeof passwordHash === 'string' && (await bcrypt.compare(current_password, passwordHash));
    if (!passwordOk) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    await pool.query(
      `UPDATE public.users
       SET deleted_at = NOW(),
           deletion_scheduled_at = NOW() + INTERVAL '7 days',
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    clearAuthCookie(res);
    res.status(200).json({ message: 'Account scheduled for deletion' });
  } catch (err) {
    console.error('[profile/deleteAccount]', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
};
