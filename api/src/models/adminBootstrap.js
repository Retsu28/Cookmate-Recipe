const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const ADMIN_EMAIL = 'admin@cookmate.com';
const ADMIN_PASSWORD = 'admin12345';
const ADMIN_NAME = 'CookMate Admin';
const BCRYPT_ROUNDS = 10;

async function ensureUserAuthConstraints() {
  const duplicates = await pool.query(`
    SELECT
      (
        SELECT COUNT(*)
        FROM (
          SELECT LOWER(BTRIM(email))
          FROM users
          GROUP BY LOWER(BTRIM(email))
          HAVING COUNT(*) > 1
        ) duplicate_emails
      ) AS duplicate_email_groups
  `);

  const duplicateEmailGroups = Number(duplicates.rows[0]?.duplicate_email_groups || 0);

  if (duplicateEmailGroups > 0) {
    throw new Error(
      'Duplicate user email values must be cleaned up before auth uniqueness constraints can be added.'
    );
  }

  await pool.query(`
    WITH normalized_users AS (
      SELECT
        id,
        LOWER(BTRIM(email)) AS normalized_email,
        COALESCE(NULLIF(BTRIM(full_name), ''), split_part(LOWER(BTRIM(email)), '@', 1)) AS base_full_name
      FROM users
    ),
    ranked_users AS (
      SELECT
        id,
        normalized_email,
        CASE
          WHEN ROW_NUMBER() OVER (PARTITION BY LOWER(BTRIM(base_full_name)) ORDER BY id) = 1
            THEN base_full_name
          ELSE CONCAT(base_full_name, ' #', id)
        END AS normalized_full_name
      FROM normalized_users
    )
    UPDATE users
    SET
      email = ranked_users.normalized_email,
      full_name = ranked_users.normalized_full_name,
      updated_at = CURRENT_TIMESTAMP
    FROM ranked_users
    WHERE users.id = ranked_users.id
      AND (
        users.email <> ranked_users.normalized_email
        OR users.full_name IS DISTINCT FROM ranked_users.normalized_full_name
      )
  `);

  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN full_name SET NOT NULL
  `);

  await pool.query(`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_full_name_not_blank
  `);

  await pool.query(`
    ALTER TABLE users
    ADD CONSTRAINT users_full_name_not_blank CHECK (BTRIM(full_name) <> '')
  `);

  await pool.query(`
    DROP INDEX IF EXISTS users_email_lower_unique_idx
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique_idx
    ON users (LOWER(BTRIM(email)))
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_full_name_lower_unique_idx
    ON users (LOWER(BTRIM(full_name)))
  `);
}

async function ensureAdminAccount() {
  await ensureUserAuthConstraints();

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  `);

  await pool.query(`
    UPDATE users
    SET role = 'user'
    WHERE role IS NULL OR role NOT IN ('user', 'admin')
  `);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

  await pool.query(
    `
      INSERT INTO users (email, password_hash, full_name, role, cooking_skill_level)
      VALUES ($1, $2, $3, 'admin', 'Advanced')
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = 'admin',
        cooking_skill_level = COALESCE(users.cooking_skill_level, 'Advanced'),
        updated_at = CURRENT_TIMESTAMP
    `,
    [ADMIN_EMAIL, passwordHash, ADMIN_NAME]
  );
}

module.exports = { ensureAdminAccount };
