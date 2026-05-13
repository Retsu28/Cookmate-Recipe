-- Admin audit log table
-- Tracks all destructive/mutating admin actions for accountability
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log (admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_entity ON admin_audit_log (entity_type, entity_id);
CREATE INDEX idx_admin_audit_log_recent ON admin_audit_log (created_at DESC);
