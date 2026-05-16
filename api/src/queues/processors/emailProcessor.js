/**
 * Email queue processor.
 *
 * Handles transactional email delivery jobs (welcome, password reset,
 * recipe notifications, etc.) via the existing mailer service.
 *
 * Job data shape:
 *   { to, subject, html, text? }
 */
const { sendMail } = require('../../config/mailer');
const logger = require('../../config/logger');

module.exports = async function emailProcessor(job) {
  const { to, subject, html, text } = job.data;

  logger.info({ jobId: job.id, to, subject }, '[emailProcessor] Sending email');

  await sendMail({ to, subject, html, text });

  return { sent: true, to, subject };
};
