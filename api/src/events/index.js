const { eventBus } = require('./eventBus');
const { onRecipeCreated } = require('./listeners/notificationListener');
const { onUserRegistered, onUserDeleted, onMfaEnabled, onMfaDisabled } = require('./listeners/auditListener');

// ─── Register All Listeners ──────────────────────────────────────────────────
eventBus.on('recipe.created', onRecipeCreated);
eventBus.on('user.registered', onUserRegistered);
eventBus.on('user.deleted', onUserDeleted);
eventBus.on('user.mfa_enabled', onMfaEnabled);
eventBus.on('user.mfa_disabled', onMfaDisabled);

module.exports = { eventBus };
