CREATE TABLE IF NOT EXISTS "webshop_purchase_intent_domain_proofs" (
  "challenge_id" uuid PRIMARY KEY NOT NULL,
  "canonical_domain" text NOT NULL,
  "installation_id" uuid NOT NULL,
  "installation_key_fingerprint" text NOT NULL,
  "installation_fingerprint_scheme" text NOT NULL,
  "proof_payload" text NOT NULL,
  "proof_signature" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "webshop_purchase_intent_domain_proofs_fingerprint_scheme_check"
    CHECK ("installation_fingerprint_scheme" = 'ed25519_spki_der_sha256_v1')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webshop_purchase_intent_domain_proofs_expiry_idx"
  ON "webshop_purchase_intent_domain_proofs" ("expires_at");
