-- Seed 6 test users to reach MIN_ROWS=10 for churn model
-- Password for all: "password123" (bcrypt hashed)
-- Run: psql -d cookmate -f seed_6_users.sql

INSERT INTO users (email, password_hash, full_name, role, cooking_skill_level, created_at, updated_at)
VALUES 
  ('test1@cookmate.app', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Test User One', 'user', 'Beginner', NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
  ('test2@cookmate.app', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Test User Two', 'user', 'Intermediate', NOW() - INTERVAL '45 days', NOW() - INTERVAL '20 days'),
  ('test3@cookmate.app', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Test User Three', 'user', 'Advanced', NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days'),
  ('test4@cookmate.app', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Test User Four', 'user', 'Beginner', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
  ('test5@cookmate.app', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Test User Five', 'user', 'Intermediate', NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 days'),
  ('test6@cookmate.app', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Test User Six', 'user', 'Beginner', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day')
ON CONFLICT (email) DO NOTHING;
