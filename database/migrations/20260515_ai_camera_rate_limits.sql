-- DB-backed rate limiting for AI Camera (3 uses per 24 hours per user)
CREATE TABLE IF NOT EXISTS ai_camera_rate_limits (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    uses_count    INTEGER NOT NULL DEFAULT 0,
    window_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_camera_rate_limits_window
    ON ai_camera_rate_limits (user_id, window_start_at);
