const { pool } = require('../config/db');

const PUBLIC_USER_COLS = 'id, email, full_name, avatar_url, notifications_enabled, role, cooking_skill_level';

exports.findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT id, email, full_name, avatar_url, notifications_enabled, role, password_hash, failed_login_attempts, locked_until, mfa_enabled FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
    [email]
  );
  return result.rows[0] || null;
};

exports.findById = async (id) => {
  const result = await pool.query(
    `SELECT ${PUBLIC_USER_COLS} FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

exports.findByIdFull = async (id) => {
  const result = await pool.query(
    `SELECT id, email, full_name, avatar_url, notifications_enabled, role, cooking_skill_level,
            mfa_enabled, mfa_secret, failed_login_attempts, locked_until, firebase_uid, password_hash
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

exports.findByFirebaseUid = async (firebaseUid) => {
  const result = await pool.query(
    'SELECT id, email, full_name, avatar_url, notifications_enabled, role, firebase_uid, mfa_enabled FROM users WHERE firebase_uid = $1 LIMIT 1',
    [firebaseUid]
  );
  return result.rows[0] || null;
};

exports.existsByEmail = async (email) => {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
    [email]
  );
  return result.rowCount > 0;
};

exports.existsByFullName = async (fullName) => {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE LOWER(BTRIM(full_name)) = $1 LIMIT 1',
    [fullName.toLowerCase()]
  );
  return result.rowCount > 0;
};

exports.create = async ({ email, passwordHash, fullName, role = 'user', firebaseUid = null, emailVerified = false }) => {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, firebase_uid, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, full_name, avatar_url, notifications_enabled, role`,
    [email, passwordHash, fullName, role, firebaseUid, emailVerified]
  );
  return result.rows[0];
};

exports.updateFirebaseLink = async (id, { firebaseUid, emailVerified, email }) => {
  if (email) {
    await pool.query(
      'UPDATE users SET email_verified = $1, email = $2 WHERE id = $3',
      [emailVerified, email, id]
    );
  } else {
    await pool.query(
      'UPDATE users SET firebase_uid = $1, email_verified = $2 WHERE id = $3',
      [firebaseUid, emailVerified, id]
    );
  }
};

exports.updateLoginAttempts = async (id, { failedAttempts, lockedUntil }) => {
  await pool.query(
    `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
    [failedAttempts, lockedUntil, id]
  );
};

exports.clearLoginLockout = async (id) => {
  await pool.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [id]
  );
};

exports.setMfaEnabled = async (id, { enabled, secret }) => {
  await pool.query(
    'UPDATE users SET mfa_enabled = $1, mfa_secret = $2 WHERE id = $3',
    [enabled, secret, id]
  );
};

exports.getProfile = async (id) => {
  const result = await pool.query(
    `SELECT id, email, full_name, avatar_url, bio, cooking_skill_level, created_at
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
};

exports.updateProfile = async (id, { email, passwordHash, fullName, bio, avatarUrl, cookingSkillLevel }) => {
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
    [email, passwordHash, fullName, bio, avatarUrl, cookingSkillLevel, id]
  );
  return result.rows[0] || null;
};

exports.updateAvatarUrl = async (id, avatarUrl) => {
  await pool.query(
    'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [avatarUrl, id]
  );
};

exports.getAvatarUrl = async (id) => {
  const result = await pool.query(
    'SELECT id, avatar_url FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
};

exports.softDelete = async (id) => {
  await pool.query(
    `UPDATE public.users
     SET deleted_at = NOW(),
         deletion_scheduled_at = NOW() + INTERVAL '7 days',
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
};

exports.getPasswordHash = async (id) => {
  const result = await pool.query(
    'SELECT id, password_hash FROM public.users WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] || null;
};

exports.existsByEmailExcludingId = async (email, excludeId) => {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE id <> $1 AND LOWER(BTRIM(email)) = $2 LIMIT 1`,
    [excludeId, email]
  );
  return result.rowCount > 0;
};

exports.findByEmailForReset = async (email) => {
  const result = await pool.query(
    'SELECT id, firebase_uid FROM users WHERE LOWER(BTRIM(email)) = $1 LIMIT 1',
    [email]
  );
  return result.rows[0] || null;
};
