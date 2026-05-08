-- CookMate Database Schema
-- Core tables for users, recipes, ingredients, etc.

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    cooking_skill_level VARCHAR(50) DEFAULT 'Beginner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_full_name_not_blank CHECK (BTRIM(full_name) <> '')
);

CREATE UNIQUE INDEX users_email_normalized_unique_idx ON users (LOWER(BTRIM(email)));

-- Ingredients table
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    image_url TEXT
);

-- Recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    source_recipe_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT[],
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    difficulty VARCHAR(50),
    servings INTEGER,
    calories INTEGER,
    protein_g DECIMAL,
    carbs_g DECIMAL,
    fat_g DECIMAL,
    region_or_origin VARCHAR(100),
    category VARCHAR(100),
    tags TEXT[],
    normalized_ingredients TEXT[],
    image_url TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX recipes_title_unique_idx ON recipes (LOWER(BTRIM(title)));
CREATE UNIQUE INDEX recipes_source_recipe_id_unique_idx ON recipes (source_recipe_id) WHERE source_recipe_id IS NOT NULL;

-- Recipe Ingredients junction table
CREATE TABLE recipe_ingredients (
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL,
    unit VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- Recipe Viewed table
CREATE TABLE recipe_viewed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, recipe_id)
);

CREATE INDEX idx_recipe_viewed_user_recent ON recipe_viewed (user_id, viewed_at DESC);

-- AI Camera saved outputs
CREATE TABLE ai_camera_saves (
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

CREATE INDEX idx_ai_camera_saves_user_recent ON ai_camera_saves (user_id, created_at DESC);

-- Meal Plans table
CREATE TABLE meal_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER REFERENCES recipes(id),
    planned_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL CHECK (LOWER(meal_type) IN ('breakfast', 'lunch', 'dinner')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Manila' CHECK (BTRIM(timezone) <> ''),
    scheduled_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    custom_time_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_version INTEGER NOT NULL DEFAULT 1 CHECK (reminder_version > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT meal_plans_time_window_check CHECK (start_time < end_time)
);

CREATE INDEX idx_meal_plans_user_date ON meal_plans (user_id, planned_date, meal_type);
CREATE INDEX idx_meal_plans_user_scheduled_start ON meal_plans (user_id, scheduled_start_at);
CREATE INDEX idx_meal_plans_due_reminders
    ON meal_plans (scheduled_start_at)
    WHERE reminder_enabled = TRUE AND notification_sent = FALSE;

-- User-level default meal reminder windows
CREATE TABLE user_meal_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type VARCHAR(50) NOT NULL CHECK (LOWER(meal_type) IN ('breakfast', 'lunch', 'dinner')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Manila' CHECK (BTRIM(timezone) <> ''),
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_meal_preferences_time_window_check CHECK (start_time < end_time),
    UNIQUE (user_id, meal_type)
);

CREATE INDEX idx_user_meal_preferences_user ON user_meal_preferences (user_id);

-- Canonical reminder events claimed by the backend worker
CREATE TABLE planner_notifications (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dedupe_key TEXT NOT NULL UNIQUE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped', 'missed', 'cancelled')),
    channel TEXT NOT NULL DEFAULT 'push',
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_planner_notifications_due
    ON planner_notifications (status, scheduled_for, next_retry_at);
CREATE INDEX idx_planner_notifications_plan
    ON planner_notifications (meal_plan_id, status);

CREATE TABLE planner_notification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    expo_push_token TEXT NOT NULL,
    permission_status TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, device_id),
    UNIQUE (expo_push_token)
);

CREATE INDEX idx_planner_notification_tokens_user_active
    ON planner_notification_tokens (user_id, is_active);

CREATE TABLE planner_device_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    reminder_version INTEGER NOT NULL,
    local_notification_id TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (meal_plan_id, device_id, reminder_version)
);

CREATE INDEX idx_planner_device_schedules_plan_device
    ON planner_device_schedules (meal_plan_id, device_id, reminder_version, is_active);

CREATE TABLE reminder_logs (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER REFERENCES meal_plans(id) ON DELETE SET NULL,
    planner_notification_id INTEGER REFERENCES planner_notifications(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT,
    channel TEXT NOT NULL,
    event_type TEXT NOT NULL,
    dedupe_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminder_logs_user_recent ON reminder_logs (user_id, created_at DESC);
CREATE INDEX idx_reminder_logs_dedupe ON reminder_logs (dedupe_key, event_type);

-- Meal planner grocery list generation metrics
CREATE TABLE meal_planner_grocery_generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_count INTEGER NOT NULL DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meal_planner_grocery_generations_user_recent
    ON meal_planner_grocery_generations (user_id, generated_at DESC);

-- Saved grocery lists ("My Saves" on the meal planner)
CREATE TABLE meal_planner_saved_grocery_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meal_planner_saved_grocery_lists_user
    ON meal_planner_saved_grocery_lists (user_id, created_at DESC);

-- Shopping Lists table
CREATE TABLE shopping_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL NOT NULL,
    unit VARCHAR(50),
    is_purchased BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Kitchen Inventory table
CREATE TABLE kitchen_inventory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL NOT NULL,
    unit VARCHAR(50),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), -- Reminder, Expiry, Goal, Recommendation
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
