const { pool } = require('../config/db');

async function purgeDeletedAccounts() {
  try {
    const result = await pool.query(
      'DELETE FROM public.users WHERE deletion_scheduled_at <= NOW() RETURNING id'
    );
    console.log(`[purgeDeletedAccounts] Deleted ${result.rowCount} account(s).`);
  } catch (err) {
    if (err?.code === '42703') {
      console.warn('[purgeDeletedAccounts] Skipped because soft-delete migration has not been applied.');
      return;
    }
    console.error('[purgeDeletedAccounts] Failed:', err);
  }
}

module.exports = { purgeDeletedAccounts };
