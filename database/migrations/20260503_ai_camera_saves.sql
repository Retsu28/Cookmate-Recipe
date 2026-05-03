-- Saved AI Camera outputs, scoped to the authenticated user.
-- Stores the finished analysis snapshot so saved results can be restored
-- without re-running Gemini.

CREATE TABLE IF NOT EXISTS ai_camera_saves (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_image_data TEXT NOT NULL,
    removed_background_image_data TEXT,
    thumbnail_image_data TEXT,
    detected_ingredient_name TEXT,
    detected_ingredient_description TEXT,
    recommended_recipe_ids INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    other_recipe_ids INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    full_analysis_result JSONB NOT NULL DEFAULT '{}'::JSONB,
    source_type VARCHAR(20) NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'capture')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_camera_saves_user_recent
  ON ai_camera_saves (user_id, created_at DESC);
