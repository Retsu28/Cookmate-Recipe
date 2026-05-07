-- Add Firebase Auth integration columns to users.
--
-- - firebase_uid: the immutable Firebase user id, set the first time a
--   user signs in via Firebase. UNIQUE so no two local rows can map to
--   the same Firebase identity.
-- - email_verified: mirrored from Firebase's `email_verified` claim so
--   the API can gate features that require a verified email.
--
-- password_hash is made nullable so accounts created via Google or
-- "Sign in with Firebase" don't need a local bcrypt password.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_unique
  ON users (firebase_uid)
  WHERE firebase_uid IS NOT NULL;

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;
