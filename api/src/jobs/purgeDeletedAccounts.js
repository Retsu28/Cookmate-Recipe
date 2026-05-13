const { pool } = require('../config/db');
const logger = require('../config/logger');

async function purgeDeletedAccounts() {
  try {
    const result = await pool.query(
      'DELETE FROM public.users WHERE deletion_scheduled_at <= NOW() RETURNING id'
    );
    logger.info(`[purgeDeletedAccounts] Deleted ${result.rowCount} account(s).`);
  } catch (err) {
    if (err?.code === '42703') {
      logger.warn('[purgeDeletedAccounts] Skipped because soft-delete migration has not been applied.');
      return;
    }
    logger.error('[purgeDeletedAccounts] Failed:', err);
  }
}

module.exports = { purgeDeletedAccounts };
