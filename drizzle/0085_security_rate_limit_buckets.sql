CREATE TABLE IF NOT EXISTS "security_rate_limit_buckets" (
  "bucket_hash" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "reset_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "security_rate_limit_buckets_reset_idx" ON "security_rate_limit_buckets" USING btree ("reset_at");
