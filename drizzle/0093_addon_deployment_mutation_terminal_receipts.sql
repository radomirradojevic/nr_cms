ALTER TABLE "cms_addon_deployment_results"
  DROP CONSTRAINT IF EXISTS "cms_addon_deployment_results_stub_final_tuple_check";
--> statement-breakpoint
ALTER TABLE "cms_addon_deployment_results"
  ADD CONSTRAINT "cms_addon_deployment_results_terminal_tuple_check"
  CHECK (
    ("result_status" = 'failed' AND "final_phase" = 'rejected_before_switch' AND "terminal_evidence_kind" = 'no_mutation_receipt') OR
    ("result_status" = 'succeeded' AND "final_phase" = 'ready' AND "terminal_evidence_kind" = 'reconciliation_receipt') OR
    ("result_status" = 'failed' AND "final_phase" IN ('rolled_back','maintenance_required','rollback_failed') AND "terminal_evidence_kind" = 'recovery_receipt')
  );
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cms_addon_deployment_candidates"
    ADD CONSTRAINT "cms_addon_deployment_candidates_terminal_receipt_fk"
    FOREIGN KEY ("terminal_receipt_id") REFERENCES "cms_addon_deployment_terminal_receipts"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cms_addon_serving_fences"
    ADD CONSTRAINT "cms_addon_serving_fences_pre_receipt_fk"
    FOREIGN KEY ("pre_operation_terminal_receipt_id") REFERENCES "cms_addon_deployment_terminal_receipts"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cms_addon_serving_fences"
    ADD CONSTRAINT "cms_addon_serving_fences_terminal_receipt_fk"
    FOREIGN KEY ("terminal_receipt_id") REFERENCES "cms_addon_deployment_terminal_receipts"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
