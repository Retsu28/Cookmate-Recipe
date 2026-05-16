-- Single-row store for the admin-editable seasonal ingredients guide.
-- key is always 'main'. The full JSON blob is stored in the data column.
CREATE TABLE IF NOT EXISTS seasonal_data (
  key         TEXT PRIMARY KEY DEFAULT 'main',
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
);
