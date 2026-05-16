const logger = require('../../config/logger');

/**
 * Listener: Logs significant user/admin actions via structured logging.
 * In the future this can write to a separate audit stream or external service.
 */
function onUserRegistered({ userId, email }) {
  logger.info({ userId, email, event: 'user.registered' }, 'New user registered');
}

function onUserDeleted({ userId, email }) {
  logger.info({ userId, email, event: 'user.deleted' }, 'User account deletion initiated');
}

function onMfaEnabled({ userId }) {
  logger.info({ userId, event: 'user.mfa_enabled' }, 'MFA enabled');
}

function onMfaDisabled({ userId }) {
  logger.info({ userId, event: 'user.mfa_disabled' }, 'MFA disabled');
}

module.exports = { onUserRegistered, onUserDeleted, onMfaEnabled, onMfaDisabled };
