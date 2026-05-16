/**
 * Image queue processor.
 *
 * Handles CPU-heavy image operations (background removal, sticker generation)
 * off the main request thread. Results are stored back to the database
 * so the client can poll or receive via socket.
 *
 * Job data shape:
 *   { taskType: 'remove-bg' | 'sticker', imageBase64, userId, saveId? }
 */
const logger = require('../../config/logger');

module.exports = async function imageProcessor(job) {
  const { taskType, userId, saveId } = job.data;

  logger.info({ jobId: job.id, taskType, userId, saveId }, '[imageProcessor] Processing image');

  // NOTE: Actual image processing logic remains in mlController.js and
  // workers/removeBackgroundWorker.js. This processor is a future hook
  // for offloading those tasks to the queue when horizontal scaling is enabled.
  // Currently a no-op placeholder that logs and returns.

  return { processed: true, taskType, userId };
};
