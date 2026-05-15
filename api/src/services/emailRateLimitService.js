/**
 * Per-email rate limiting service
 * Tracks failed login/signup attempts by email address, preventing:
 * - Login attempts during lockout
 * - Account creation during lockout  
 * - Google sign-in during lockout
 * 
 * This works even for emails that don't have accounts yet.
 */

const { pool } = require('../config/db');

const EMAIL_RATE_LIMIT_MAX_ATTEMPTS = 10;
const EMAIL_RATE_LIMIT_LOCK_MINUTES = 15;

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

/**
 * Check if an email is currently locked out
 * Returns lockout info or null if not locked
 */
async function checkEmailLockout(email) {
  const normalizedEmail = normalizeEmail(email);
  
  const result = await pool.query(
    `SELECT failed_attempts, locked_until, 
            EXTRACT(EPOCH FROM (locked_until - NOW()))::INTEGER as seconds_remaining
     FROM email_rate_limits 
     WHERE LOWER(BTRIM(email)) = $1`,
    [normalizedEmail]
  );
  
  if (result.rowCount === 0) {
    return null; // No rate limit record for this email
  }
  
  const row = result.rows[0];
  
  // Check if still locked
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const minutesLeft = Math.ceil(row.seconds_remaining / 60);
    const secondsLeft = Math.max(0, row.seconds_remaining);
    
    return {
      locked: true,
      email: normalizedEmail,
      failedAttempts: row.failed_attempts,
      minutesLeft,
      secondsLeft,
      lockedUntil: row.locked_until,
      lockoutMinutes: EMAIL_RATE_LIMIT_LOCK_MINUTES,
      retryAfter: secondsLeft,
      attemptsRemaining: 0,
    };
  }
  
  // Not locked, return remaining attempts
  const attemptsRemaining = Math.max(0, EMAIL_RATE_LIMIT_MAX_ATTEMPTS - row.failed_attempts);
  
  return {
    locked: false,
    email: normalizedEmail,
    failedAttempts: row.failed_attempts,
    attemptsRemaining,
    warning: attemptsRemaining <= 3,
    maxAttempts: EMAIL_RATE_LIMIT_MAX_ATTEMPTS,
  };
}

/**
 * Record a failed attempt for an email
 * Returns the updated rate limit state
 */
async function recordFailedAttempt(email) {
  const normalizedEmail = normalizeEmail(email);
  
  // Use UPSERT to create or update the rate limit record
  const result = await pool.query(
    `INSERT INTO email_rate_limits (email, failed_attempts, locked_until, last_attempt_at)
     VALUES ($1, 1, NULL, NOW())
     ON CONFLICT (email) DO UPDATE SET
       failed_attempts = CASE 
         WHEN email_rate_limits.locked_until IS NOT NULL 
              AND email_rate_limits.locked_until > NOW() 
         THEN email_rate_limits.failed_attempts  -- Don't increment if locked
         ELSE LEAST(email_rate_limits.failed_attempts + 1, ${EMAIL_RATE_LIMIT_MAX_ATTEMPTS})
       END,
       last_attempt_at = NOW(),
       locked_until = CASE
         WHEN email_rate_limits.locked_until IS NOT NULL 
              AND email_rate_limits.locked_until > NOW()
         THEN email_rate_limits.locked_until  -- Keep existing lock
         WHEN email_rate_limits.failed_attempts + 1 >= ${EMAIL_RATE_LIMIT_MAX_ATTEMPTS}
         THEN NOW() + INTERVAL '${EMAIL_RATE_LIMIT_LOCK_MINUTES} minutes'
         ELSE NULL
       END
     RETURNING failed_attempts, locked_until,
               EXTRACT(EPOCH FROM (locked_until - NOW()))::INTEGER as seconds_remaining`,
    [normalizedEmail]
  );
  
  const row = result.rows[0];
  const shouldLock = row.failed_attempts >= EMAIL_RATE_LIMIT_MAX_ATTEMPTS;
  
  if (shouldLock && row.locked_until) {
    const minutesLeft = Math.ceil(row.seconds_remaining / 60);
    const secondsLeft = Math.max(0, row.seconds_remaining);
    
    return {
      locked: true,
      email: normalizedEmail,
      failedAttempts: row.failed_attempts,
      minutesLeft,
      secondsLeft,
      lockedUntil: row.locked_until,
      lockoutMinutes: EMAIL_RATE_LIMIT_LOCK_MINUTES,
      retryAfter: secondsLeft,
      attemptsRemaining: 0,
    };
  }
  
  const attemptsRemaining = Math.max(0, EMAIL_RATE_LIMIT_MAX_ATTEMPTS - row.failed_attempts);
  
  return {
    locked: false,
    email: normalizedEmail,
    failedAttempts: row.failed_attempts,
    attemptsRemaining,
    warning: attemptsRemaining <= 3,
    maxAttempts: EMAIL_RATE_LIMIT_MAX_ATTEMPTS,
  };
}

/**
 * Clear rate limit record for an email (e.g., on successful login)
 */
async function clearEmailRateLimit(email) {
  const normalizedEmail = normalizeEmail(email);
  
  await pool.query(
    `DELETE FROM email_rate_limits WHERE LOWER(BTRIM(email)) = $1`,
    [normalizedEmail]
  );
}

/**
 * Get rate limit status for an email (for displaying to user)
 */
async function getEmailRateLimitStatus(email) {
  return await checkEmailLockout(email);
}

/**
 * Format rate limit info for API response
 */
function formatRateLimitResponse(rateLimitInfo, customMessage) {
  if (!rateLimitInfo || !rateLimitInfo.locked) {
    return null;
  }
  
  const minutes = rateLimitInfo.minutesLeft;
  const timeString = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  
  return {
    error: customMessage || `Too many failed attempts. Please try again in ${timeString}.`,
    code: 'auth/too-many-attempts',
    rateLimit: {
      locked: true,
      email: rateLimitInfo.email,
      minutesLeft: rateLimitInfo.minutesLeft,
      secondsLeft: rateLimitInfo.secondsLeft,
      lockoutMinutes: rateLimitInfo.lockoutMinutes,
      retryAfter: rateLimitInfo.retryAfter,
      attemptsRemaining: 0,
    },
  };
}

module.exports = {
  checkEmailLockout,
  recordFailedAttempt,
  clearEmailRateLimit,
  getEmailRateLimitStatus,
  formatRateLimitResponse,
  EMAIL_RATE_LIMIT_MAX_ATTEMPTS,
  EMAIL_RATE_LIMIT_LOCK_MINUTES,
};
