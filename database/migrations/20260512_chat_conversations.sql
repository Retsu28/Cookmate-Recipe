-- Chat conversations table for CookMate AI
-- Stores conversation history per user, messages as JSONB array

BEGIN;

CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user conversation lookup
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated 
    ON chat_conversations (user_id, updated_at DESC);

-- Unique constraint: one conversation per user (for Phase 1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversations_user_unique 
    ON chat_conversations (user_id);

COMMIT;
