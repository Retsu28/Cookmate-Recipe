-- Login lockout: per-account columns on users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Email-level rate limiting table (tracks by email, even for non-existent accounts)
CREATE TABLE IF NOT EXISTS email_rate_limits (
    email              TEXT PRIMARY KEY,
    failed_attempts    INTEGER NOT NULL DEFAULT 0,
    locked_until       TIMESTAMP WITH TIME ZONE,
    last_attempt_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_rate_limits_locked_until ON email_rate_limits (locked_until);

-- IP-level rate limiting table
CREATE TABLE IF NOT EXISTS ip_rate_limits (
    ip                 TEXT PRIMARY KEY,
    failed_attempts    INTEGER NOT NULL DEFAULT 0,
    locked_until       TIMESTAMP WITH TIME ZONE,
    last_attempt_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limits_locked_until ON ip_rate_limits (locked_until);
