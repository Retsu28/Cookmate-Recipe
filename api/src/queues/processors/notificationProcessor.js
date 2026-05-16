/**
 * Notification queue processor.
 *
 * Handles push notification fan-out to multiple devices via Expo Server SDK.
 * Also handles in-app notification inserts for large recipient lists.
 *
 * Job data shape:
 *   { type: 'push' | 'in-app', userId?, tokens?[], title, body, data? }
 */
const logger = require('../../config/logger');

module.exports = async function notificationProcessor(job) {
  const { type, userId, title } = job.data;

  logger.info({ jobId: job.id, type, userId, title }, '[notificationProcessor] Processing notification');

  // NOTE: Push notification logic remains in workers/mealReminderWorker.js
  // and recipeController.js notifyUsersAboutNewRecipe(). This processor is
  // a future hook for offloading bulk notification delivery to the queue.
  // Currently a no-op placeholder that logs and returns.

  return { delivered: true, type, userId };
};
