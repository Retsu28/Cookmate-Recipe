/**
 * Per-IP rate limiting service (DB-backed, survives server restarts)
 * Tracks failed login attempts by IP address.
 * Works alongside emailRateLimitService for dual-layer protection.
 */

const { pool } = require('../config/db');

const IP_MAX_ATTEMPTS = 20;       // 20 failed attempts across any emails
const IP_LOCK_MINUTES = 15;

/**
 * Check if an IP is currently locked out.
 * Returns lockout info or null if not locked.
 */
async function checkIpLockout(ip) {
  const result = await pool.query(
    `SELECT failed_attempts, locked_until,
            EXTRACT(EPOCH FROM (locked_until - NOW()))::INTEGER AS seconds_remaining
     FROM ip_rate_limits
     WHERE ip = $1`,
    [ip]
  );

  if (result.rowCount === 0) return null;

  const row = result.rows[0];

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const secondsLeft = Math.max(0, row.seconds_remaining);
    return {
      locked: true,
      ip,
      failedAttempts: row.failed_attempts,
      minutesLeft: Math.ceil(secondsLeft / 60),
      secondsLeft,
      lockedUntil: row.locked_until,
      lockoutMinutes: IP_LOCK_MINUTES,
      retryAfter: secondsLeft,
      attemptsRemaining: 0,
    };
  }

  return {
    locked: false,
    ip,
    failedAttempts: row.failed_attempts,
    attemptsRemaining: Math.max(0, IP_MAX_ATTEMPTS - row.failed_attempts),
    maxAttempts: IP_MAX_ATTEMPTS,
  };
}

/**
 * Record a failed attempt for an IP.
 * Returns the updated rate limit state.
 */
async function recordIpFailedAttempt(ip) {
  const result = await pool.query(
    `INSERT INTO ip_rate_limits (ip, failed_attempts, locked_until, last_attempt_at)
     VALUES ($1, 1, NULL, NOW())
     ON CONFLICT (ip) DO UPDATE SET
       failed_attempts = CASE
         WHEN ip_rate_limits.locked_until IS NOT NULL
              AND ip_rate_limits.locked_until > NOW()
         THEN ip_rate_limits.failed_attempts
         ELSE LEAST(ip_rate_limits.failed_attempts + 1, ${IP_MAX_ATTEMPTS})
       END,
       last_attempt_at = NOW(),
       locked_until = CASE
         WHEN ip_rate_limits.locked_until IS NOT NULL
              AND ip_rate_limits.locked_until > NOW()
         THEN ip_rate_limits.locked_until
         WHEN ip_rate_limits.failed_attempts + 1 >= ${IP_MAX_ATTEMPTS}
         THEN NOW() + INTERVAL '${IP_LOCK_MINUTES} minutes'
         ELSE NULL
       END
     RETURNING failed_attempts, locked_until,
               EXTRACT(EPOCH FROM (locked_until - NOW()))::INTEGER AS seconds_remaining`,
    [ip]
  );

  const row = result.rows[0];

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const secondsLeft = Math.max(0, row.seconds_remaining);
    return {
      locked: true,
      ip,
      failedAttempts: row.failed_attempts,
      minutesLeft: Math.ceil(secondsLeft / 60),
      secondsLeft,
      lockedUntil: row.locked_until,
      lockoutMinutes: IP_LOCK_MINUTES,
      retryAfter: secondsLeft,
      attemptsRemaining: 0,
    };
  }

  return {
    locked: false,
    ip,
    failedAttempts: row.failed_attempts,
    attemptsRemaining: Math.max(0, IP_MAX_ATTEMPTS - row.failed_attempts),
    maxAttempts: IP_MAX_ATTEMPTS,
  };
}

/**
 * Clear IP rate limit on successful login (optional — reduces false positives
 * for shared IPs like offices/schools only after a clean auth).
 * We do NOT clear on success to avoid abuse: attacker logs in with valid
 * creds after hammering to reset the IP counter.
 */

/**
 * Extract the real client IP, respecting X-Forwarded-For from trusted proxies.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

module.exports = {
  checkIpLockout,
  recordIpFailedAttempt,
  getClientIp,
  IP_MAX_ATTEMPTS,
  IP_LOCK_MINUTES,
};
