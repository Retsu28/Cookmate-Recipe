-- Migration: Add video filename and instruction timestamps to recipes

-- Add video filename column (for uploaded MP4 files)
ALTER TABLE recipes ADD COLUMN video_filename TEXT;

-- Add instruction timestamps column (JSON array matching instructions array)
-- Format: [{"start": 0, "end": 30}, {"start": 31, "end": 60}, ...]
ALTER TABLE recipes ADD COLUMN instruction_timestamps JSONB DEFAULT '[]'::JSONB;

-- Create uploads/mp4 directory if needed (run manually on server)
-- mkdir -p api/uploads/mp4
