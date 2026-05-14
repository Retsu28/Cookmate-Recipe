-- Migration: Add chat_feedback table for AI response feedback
-- Created: 2026-05-14

CREATE TABLE IF NOT EXISTS chat_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_index INTEGER NOT NULL, -- Position in conversation
    feedback_type VARCHAR(10) CHECK (feedback_type IN ('up', 'down')),
    ai_message TEXT, -- The AI response that was rated
    user_message TEXT, -- The user query that prompted the response
    conversation_context JSONB, -- Optional: full conversation context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_chat_feedback_user ON chat_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_type ON chat_feedback(feedback_type);
