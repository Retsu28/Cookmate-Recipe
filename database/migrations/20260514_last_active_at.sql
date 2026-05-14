-- Add last_active_at to users for accurate online/offline status tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- Seed from updated_at so existing users have a reasonable starting point
UPDATE users SET last_active_at = updated_at WHERE last_active_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users (last_active_at DESC);
