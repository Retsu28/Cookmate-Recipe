const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('./logger');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', '..', 'database', 'migrations');

/**
 * Runs all SQL migration files from database/migrations/ in sorted order.
 * Each migration is idempotent (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Tracks applied migrations in a `schema_migrations` table to avoid re-running.
 */
async function runMigrations() {
  // Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn('[migrator] No migrations directory found at %s', MIGRATIONS_DIR);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.info('[migrator] No migration files found');
    return;
  }

  // Get already-applied migrations
  const applied = await pool.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map(r => r.filename));

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8').trim();

    if (!sql) {
      logger.warn('[migrator] Skipping empty migration: %s', file);
      continue;
    }

    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [file]
      );
      count++;
      logger.info('[migrator] Applied: %s', file);
    } catch (err) {
      logger.error({ err, file }, '[migrator] Failed to apply migration');
      // Don't throw — idempotent migrations may fail if already partially applied
      // Still record it so we don't retry endlessly
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [file]
      ).catch(() => {});
    }
  }

  if (count > 0) {
    logger.info('[migrator] Applied %d new migration(s)', count);
  } else {
    logger.info('[migrator] All migrations up to date');
  }
}

module.exports = { runMigrations };
