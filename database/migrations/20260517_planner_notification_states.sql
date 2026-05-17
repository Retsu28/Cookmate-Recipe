CREATE TABLE IF NOT EXISTS planner_notification_states (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref_type   VARCHAR(32) NOT NULL,
  ref_id     INTEGER NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ref_type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_notif_states_user ON planner_notification_states(user_id);
