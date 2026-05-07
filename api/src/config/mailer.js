/**
 * Gmail SMTP transporter (nodemailer).
 *
 * Reads credentials from environment:
 *   SMTP_HOST       (default: smtp.gmail.com)
 *   SMTP_PORT       (default: 465)
 *   SMTP_SECURE     (default: true  — use SSL on 465; set "false" for 587/STARTTLS)
 *   SMTP_USER       Gmail address sending mail (e.g. cookmate067@gmail.com)
 *   SMTP_PASS       Gmail App Password (16-char, no spaces)
 *   MAIL_FROM       Optional "Display Name <addr@gmail.com>" for the From header
 *
 * Exposes a single `sendMail(opts)` helper and a lazily-created transporter.
 */
const nodemailer = require('nodemailer');

let cachedTransporter = null;

function buildTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return null; // Mail sending is optional in dev; callers should handle null.
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE == null
      ? port === 465
      : String(process.env.SMTP_SECURE).toLowerCase() !== 'false';

  // Gmail app passwords are typically copied with spaces between groups;
  // strip them so users don't hit "Invalid login" errors.
  const cleanedPass = pass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: cleanedPass },
  });
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = buildTransporter();
  return cachedTransporter;
}

/**
 * Send an email via configured Gmail SMTP. Returns the nodemailer info object
 * on success, or `null` when SMTP credentials are not configured (no-op).
 *
 * @param {Object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {string} [opts.from]
 */
async function sendMail(opts) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[mailer] SMTP_USER/SMTP_PASS not set — skipping sendMail');
    return null;
  }
  const from =
    opts.from ||
    process.env.MAIL_FROM ||
    `CookMate <${process.env.SMTP_USER}>`;
  return transporter.sendMail({ ...opts, from });
}

module.exports = { sendMail, getTransporter };
