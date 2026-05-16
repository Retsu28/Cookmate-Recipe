/**
 * Analytics queue processor.
 *
 * Handles non-critical write operations that can be deferred:
 * - Recipe view tracking
 * - User activity logging
 * - AI camera usage metrics
 *
 * Job data shape:
 *   { event, userId?, recipeId?, metadata? }
 */
const logger = require('../../config/logger');

module.exports = async function analyticsProcessor(job) {
  const { event, userId, recipeId } = job.data;

  logger.info({ jobId: job.id, event, userId, recipeId }, '[analyticsProcessor] Processing analytics event');

  // NOTE: Analytics writes currently happen inline in controllers.
  // This processor is a future hook for deferring non-critical writes
  // to reduce response latency. Currently a no-op placeholder.

  return { recorded: true, event };
};
