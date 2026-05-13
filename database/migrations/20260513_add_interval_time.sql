-- Migration: Add interval time support to instruction timestamps

-- Note: The instruction_timestamps column already exists as JSONB
-- Format now includes interval field: [{"start": 0, "end": 30, "interval": 0}, ...]
-- interval = optional additional cooking time in seconds

-- If you need to update existing data to include interval field:
UPDATE recipes 
SET instruction_timestamps = (
   SELECT jsonb_agg(
     jsonb_set(elem, '{interval}', '0'::jsonb)
   )
   FROM jsonb_array_elements(instruction_timestamps) AS elem
 )
 WHERE instruction_timestamps IS NOT NULL;
