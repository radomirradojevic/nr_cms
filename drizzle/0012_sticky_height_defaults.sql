-- Change column defaults for sticky header/footer heights
ALTER TABLE "global_settings"
  ALTER COLUMN "sticky_header_height" SET DEFAULT 80,
  ALTER COLUMN "sticky_footer_height" SET DEFAULT 110;

-- Update existing singleton row if it still has the original defaults
UPDATE "global_settings"
SET
  "sticky_header_height" = 80,
  "sticky_footer_height" = 110
WHERE id = 1
  AND "sticky_header_height" = 0
  AND "sticky_footer_height" = 0;
