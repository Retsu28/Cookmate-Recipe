-- Enforce non-duplicated auth identity fields for existing CookMate databases.
-- Run after database/schema.sql has already created the users table.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        GROUP BY LOWER(BTRIM(email))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot add unique auth constraints: duplicate emails exist after normalization.';
    END IF;
END $$;

WITH normalized_users AS (
    SELECT
        id,
        LOWER(BTRIM(email)) AS normalized_email,
        COALESCE(NULLIF(BTRIM(full_name), ''), split_part(LOWER(BTRIM(email)), '@', 1)) AS base_full_name
    FROM users
),
ranked_users AS (
    SELECT
        id,
        normalized_email,
        CASE
            WHEN ROW_NUMBER() OVER (PARTITION BY LOWER(BTRIM(base_full_name)) ORDER BY id) = 1
                THEN base_full_name
            ELSE CONCAT(base_full_name, ' #', id)
        END AS normalized_full_name
    FROM normalized_users
)
UPDATE users
SET
    email = ranked_users.normalized_email,
    full_name = ranked_users.normalized_full_name,
    updated_at = CURRENT_TIMESTAMP
FROM ranked_users
WHERE users.id = ranked_users.id
  AND (
    users.email <> ranked_users.normalized_email
    OR users.full_name IS DISTINCT FROM ranked_users.normalized_full_name
  );

ALTER TABLE users
    ALTER COLUMN full_name SET NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_full_name_not_blank;

ALTER TABLE users
    ADD CONSTRAINT users_full_name_not_blank CHECK (BTRIM(full_name) <> '');

DROP INDEX IF EXISTS users_email_lower_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique_idx
    ON users (LOWER(BTRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS users_full_name_lower_unique_idx
    ON users (LOWER(BTRIM(full_name)));

COMMIT;
