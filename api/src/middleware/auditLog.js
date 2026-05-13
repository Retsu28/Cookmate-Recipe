const { pool } = require('../config/db');
const logger = require('../config/logger');

/**
 * Returns an Express middleware that writes an audit log entry.
 * Usage: router.delete('/:id', requireAdmin, auditLog('delete_recipe', 'recipe'), handler)
 *
 * @param {string} action  - e.g. 'delete_recipe', 'update_user_role', 'delete_review'
 * @param {string} entityType - e.g. 'recipe', 'user', 'review', 'ingredient'
 * @param {(req) => number|null} getEntityId - optional fn to extract entity id from req
 */
function auditLog(action, entityType, getEntityId = null) {
  return async (req, _res, next) => {
    req._auditAction = action;
    req._auditEntityType = entityType;
    req._auditGetEntityId = getEntityId;
    next();
  };
}

/**
 * Call this inside a route handler after a successful mutation to persist the log.
 */
async function writeAuditLog(req, { entityId = null, metadata = {} } = {}) {
  try {
    const adminId = req.user?.id;
    if (!adminId) return;

    const resolvedEntityId =
      entityId ??
      (req._auditGetEntityId ? req._auditGetEntityId(req) : null) ??
      (req.params?.id ? parseInt(req.params.id, 10) : null);

    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId,
        req._auditAction || 'unknown',
        req._auditEntityType || 'unknown',
        resolvedEntityId || null,
        JSON.stringify(metadata),
        req.ip || null,
      ]
    );
  } catch (err) {
    logger.warn({ err }, '[auditLog] Failed to write audit log entry');
  }
}

module.exports = { auditLog, writeAuditLog };
