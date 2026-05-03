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
    meal_slot VARCHAR(50), -- Breakfast, Lunch, Dinner, Snack
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
