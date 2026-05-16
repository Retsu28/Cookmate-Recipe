/**
 * BullMQ job queues and workers.
 *
 * Provides named queues for background processing. Workers run in the same
 * process for simplicity but can be split into separate worker processes
 * for horizontal scaling.
 *
 * Queues defined:
 *   - emailQueue       — transactional email delivery
 *   - imageQueue       — background removal / sticker generation
 *   - notificationQueue — push notification fan-out
 *   - analyticsQueue   — non-critical analytics writes
 *
 * Environment variables:
 *   REDIS_URL / REDIS_HOST / REDIS_PORT — same as config/redis.js
 *   BULL_CONCURRENCY — worker concurrency per queue (default: 3)
 */
const { Queue, Worker } = require('bullmq');
const logger = require('../config/logger');

const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const BULL_CONCURRENCY = parseInt(process.env.BULL_CONCURRENCY || '3', 10);

// ─── Lazy state ──────────────────────────────────────────────────────────────

let emailQueue = null;
let imageQueue = null;
let notificationQueue = null;
let analyticsQueue = null;
let workers = [];

// ─── Workers ─────────────────────────────────────────────────────────────────

function startWorkers() {
  const connection = REDIS_URL
    ? { url: REDIS_URL }
    : { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD };

  const processors = {
    email: require('./processors/emailProcessor'),
    image: require('./processors/imageProcessor'),
    notification: require('./processors/notificationProcessor'),
    analytics: require('./processors/analyticsProcessor'),
  };

  emailQueue = new Queue('cookmate-email', { connection });
  imageQueue = new Queue('cookmate-image', { connection });
  notificationQueue = new Queue('cookmate-notification', { connection });
  analyticsQueue = new Queue('cookmate-analytics', { connection });

  const emailWorker = new Worker('cookmate-email', processors.email, {
    connection,
    concurrency: BULL_CONCURRENCY,
  });

  const imageWorker = new Worker('cookmate-image', processors.image, {
    connection,
    concurrency: 2, // image processing is CPU-heavy
  });

  const notificationWorker = new Worker('cookmate-notification', processors.notification, {
    connection,
    concurrency: BULL_CONCURRENCY,
  });

  const analyticsWorker = new Worker('cookmate-analytics', processors.analytics, {
    connection,
    concurrency: BULL_CONCURRENCY,
  });

  workers = [emailWorker, imageWorker, notificationWorker, analyticsWorker];

  workers.forEach((w) => {
    w.on('failed', (job, err) => {
      logger.error({ queue: w.name, jobId: job?.id, err: err.message }, '[queue] Job failed');
    });
    w.on('error', (err) => {
      logger.error({ queue: w.name, err: err.message }, '[queue] Worker error');
    });
  });

  logger.info({ queues: ['email', 'image', 'notification', 'analytics'], concurrency: BULL_CONCURRENCY }, '[queue] Workers started');
}

async function closeWorkers() {
  await Promise.all(workers.map((w) => w.close()));
  logger.info('[queue] Workers closed');
}

module.exports = {
  get emailQueue() { return emailQueue; },
  get imageQueue() { return imageQueue; },
  get notificationQueue() { return notificationQueue; },
  get analyticsQueue() { return analyticsQueue; },
  startWorkers,
  closeWorkers,
};
