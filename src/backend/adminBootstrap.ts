import bcrypt from 'bcryptjs';
import { pool } from './db';

const ADMIN_EMAIL = 'admin@cookmate.com';
const ADMIN_PASSWORD = 'admin12345';
const ADMIN_NAME = 'CookMate Admin';
const BCRYPT_ROUNDS = 10;

export async function ensureAdminAccount() {
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
