-- Migration: Add video credits field to recipes

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS video_credits TEXT;
