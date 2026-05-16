-- Add per-row visibility settings to content
ALTER TABLE "content"
  ADD COLUMN IF NOT EXISTS "visibility" jsonb
  NOT NULL
  DEFAULT '{"public":true,"roles":[]}'::jsonb;
