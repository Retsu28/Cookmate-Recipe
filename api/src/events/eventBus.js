const EventEmitter = require('events');

/**
 * Application-wide event bus for decoupling side-effects from controllers.
 *
 * Usage in controllers:
 *   const { eventBus } = require('../events/eventBus');
 *   eventBus.emit('recipe.created', { recipeId, title, imageUrl, authorId });
 *
 * Usage in listeners:
 *   eventBus.on('recipe.created', async (payload) => { ... });
 *
 * Events:
 *   - user.registered     { userId, email, fullName }
 *   - user.logged_in      { userId, email }
 *   - user.mfa_enabled    { userId }
 *   - user.mfa_disabled   { userId }
 *   - user.deleted        { userId, email }
 *   - recipe.created      { recipeId, title, imageUrl, authorId }
 *   - recipe.updated      { recipeId, title, authorId }
 *   - recipe.deleted      { recipeId, title, authorId }
 *   - mealplan.created    { planId, userId, recipeId, mealType }
 *   - mealplan.updated    { planId, userId }
 *   - mealplan.deleted    { planId, userId }
 */
class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Raise max listeners to avoid warnings for many event subscribers
    this.setMaxListeners(30);
  }
}

const eventBus = new AppEventBus();

module.exports = { eventBus };
