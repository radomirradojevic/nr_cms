ALTER TABLE "cms_addon_migrations" ADD COLUMN IF NOT EXISTS "release_id" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_deployment_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "result_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL REFERENCES "cms_addon_operations"("id") ON DELETE RESTRICT,
  "worker_job_id" text NOT NULL,
  "result_body_hash" text NOT NULL,
  "result_status" text NOT NULL,
  "final_phase" text NOT NULL,
  "terminal_evidence_kind" text NOT NULL,
  "terminal_evidence_hash" text NOT NULL,
  "received_payload" jsonb NOT NULL,
  "initial_ack" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_deployment_results_result_id_unique" UNIQUE("result_id"),
  CONSTRAINT "cms_addon_deployment_results_operation_job_unique" UNIQUE("operation_id","worker_job_id"),
  CONSTRAINT "cms_addon_deployment_results_initial_ack_check" CHECK ("initial_ack" IN ('applied','stale_installation_ignored','stale_epoch_ignored','stale_generation_ignored')),
  CONSTRAINT "cms_addon_deployment_results_stub_final_tuple_check" CHECK ("result_status" = 'failed' AND "final_phase" = 'rejected_before_switch' AND "terminal_evidence_kind" = 'no_mutation_receipt')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_deployment_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operation_id" uuid NOT NULL REFERENCES "cms_addon_operations"("id") ON DELETE RESTRICT,
  "worker_job_id" text NOT NULL,
  "installation_deployment_epoch" bigint NOT NULL,
  "generation" integer NOT NULL,
  "evidence" jsonb NOT NULL,
  "terminal_receipt_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_deployment_candidates_operation_job_epoch_generation_unique" UNIQUE("operation_id","worker_job_id","installation_deployment_epoch","generation")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_serving_fences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_profile" text NOT NULL,
  "addon_key" text NOT NULL,
  "installation_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL REFERENCES "cms_addon_operations"("id") ON DELETE RESTRICT,
  "worker_job_id" text NOT NULL,
  "installation_deployment_epoch" bigint NOT NULL,
  "generation" integer NOT NULL,
  "pre_operation_serving_state_hash" text NOT NULL,
  "pre_operation_terminal_receipt_id" uuid,
  "state" text NOT NULL DEFAULT 'active',
  "terminal_receipt_id" uuid,
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at" timestamp with time zone,
  CONSTRAINT "cms_addon_serving_fences_operation_unique" UNIQUE("operation_id"),
  CONSTRAINT "cms_addon_serving_fences_tuple_unique" UNIQUE("target_profile","addon_key","installation_id","installation_deployment_epoch","generation"),
  CONSTRAINT "cms_addon_serving_fences_state_check" CHECK ("state" IN ('active','resolved_success','resolved_recovery','resolved_no_mutation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cms_addon_serving_fences_active_target_addon_unique" ON "cms_addon_serving_fences" ("target_profile","addon_key") WHERE "state" = 'active';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cms_addon_deployment_terminal_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operation_id" uuid NOT NULL REFERENCES "cms_addon_operations"("id") ON DELETE RESTRICT,
  "worker_job_id" text NOT NULL,
  "kind" text NOT NULL,
  "evidence_hash" text NOT NULL,
  "final_tuple" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_addon_deployment_terminal_receipts_operation_job_unique" UNIQUE("operation_id","worker_job_id"),
  CONSTRAINT "cms_addon_deployment_terminal_receipts_kind_check" CHECK ("kind" IN ('reconciliation_receipt','recovery_receipt','no_mutation_receipt'))
);
