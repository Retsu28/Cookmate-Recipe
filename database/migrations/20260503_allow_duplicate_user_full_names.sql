-- Allow different users to share the same display/full name.
-- Email remains the unique login identifier.

DROP INDEX IF EXISTS users_full_name_lower_unique_idx;
