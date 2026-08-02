import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

import {
  buildLocalDatabaseUrl,
  parseStrictArguments,
  resolveCmsCoreTarget,
} from "./core-db-contract.mjs";
import {
  assertProtectedOperatorPasswordFile,
  assertWindowsAdministrator,
  readProtectedOperatorPasswordFile,
} from "./core-db-provisioning.mjs";
import {
  canonicalJson,
  loadWebshopSchemaManifest,
  quoteWebshopIdentifier,
  resolveWebshopTarget,
  sha256,
} from "./webshop-schema-contract.mjs";
import {
  inspectLegacyWebshopPublicSchema,
  inspectWebshopSchema,
} from "./webshop-schema-fingerprint.mjs";

const { Client } = pg;
const ADMIN_PASSWORD_FILE = "D:\\nr_runtime\\operator-input\\cms-core-postgres-admin.password";
const ALLOWED_METADATA_KEYS = ["settings", "storefrontPresets", "orderNumberAllocator"];
const WEBSHOP_ID_TABLES = [
  "webshop_carts",
  "webshop_checkout_sessions",
  "webshop_orders",
  "webshop_coupons",
  "webshop_wishlists",
  "webshop_related_products",
];
const LEGACY_CONSTRAINT_RENAMES = Object.freeze([
  ["webshop_payment_attempts", "webshop_payment_attempts_order_id_fkey", "webshop_payment_attempts_order_id_webshop_orders_id_fk"],
  ["webshop_payment_attempts", "webshop_payment_attempts_checkout_session_id_fkey", "webshop_payment_attempts_checkout_session_id_webshop_checkout_s"],
  ["webshop_payment_attempts", "webshop_payment_attempts_payment_id_fkey", "webshop_payment_attempts_payment_id_webshop_payments_id_fk"],
  ["webshop_payment_disputes", "webshop_payment_disputes_payment_id_fkey", "webshop_payment_disputes_payment_id_webshop_payments_id_fk"],
  ["webshop_payment_disputes", "webshop_payment_disputes_order_id_fkey", "webshop_payment_disputes_order_id_webshop_orders_id_fk"],
  ["webshop_payment_provider_references", "webshop_payment_provider_references_payment_id_fkey", "webshop_payment_provider_references_payment_id_webshop_payments"],
  ["webshop_refund_items", "webshop_refund_items_refund_id_fkey", "webshop_refund_items_refund_id_webshop_refunds_id_fk"],
  ["webshop_refund_items", "webshop_refund_items_order_item_id_fkey", "webshop_refund_items_order_item_id_webshop_order_items_id_fk"],
]);

function fail(message) {
  throw new Error(`[webshop-schema-cutover] ${message}`);
}

function readArguments(argv) {
  const parsed = parseStrictArguments(
    argv,
    ["--target", "--expected-manifest-sha256", "--backup-receipt-file"],
    ["--apply", "--dry-run"],
  );
  if (!parsed.values.has("--target")) fail("--target is required.");
  if (!parsed.values.has("--expected-manifest-sha256")) {
    fail("--expected-manifest-sha256 is required.");
  }
  if (parsed.flags.has("--apply") === parsed.flags.has("--dry-run")) {
    fail("specify exactly one of --dry-run or --apply.");
  }
  if (parsed.flags.has("--apply") && !parsed.values.has("--backup-receipt-file")) {
    fail("--backup-receipt-file is required for --apply.");
  }
  return parsed;
}

function assertBackupReceipt(value) {
  const checked = assertProtectedOperatorPasswordFile(value);
  const receipt = fs.readFileSync(checked, "utf8").trim();
  if (!receipt || receipt.length > 16 * 1024) fail("backup receipt is empty or invalid.");
  return path.resolve(checked);
}

export async function classifyWebshopSchemaCutoverState(client, manifest) {
  const rows = await client.query(
    `SELECT n.nspname AS schema_name, c.relname
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r','p')
        AND n.nspname IN ('public','webshop')
        AND (c.relname = ANY($1::text[]) OR c.relname IN ('webshops','webshop_settings'))
      ORDER BY n.nspname, c.relname`,
    [manifest.relocatedBusinessTables],
  );
  const publicTables = rows.rows.filter((row) => row.schema_name === "public").map((row) => row.relname);
  const webshopTables = rows.rows.filter((row) => row.schema_name === "webshop").map((row) => row.relname);
  const expectedLegacy = new Set(manifest.relocatedBusinessTables);
  const expectedCanonical = new Set(["webshops", "webshop_settings", ...manifest.relocatedBusinessTables]);
  const legacy =
    publicTables.length === 45 &&
    publicTables.every((table) => expectedLegacy.has(table)) &&
    webshopTables.length === 0
      ? await inspectLegacyWebshopPublicSchema(client, manifest)
      : null;
  const exactLegacy = Boolean(
    legacy?.isExactLegacyTableSet &&
      legacy.fingerprint === manifest.legacyPublicSchemaFingerprintSha256,
  );
  const exactCanonical = publicTables.length === 0 && webshopTables.length === 47 && webshopTables.every((table) => expectedCanonical.has(table));
  return {
    exactCanonical,
    exactLegacy,
    legacyPublicSchemaFingerprintSha256: legacy?.fingerprint ?? null,
    publicTables: publicTables.sort(),
    webshopTables: webshopTables.sort(),
  };
}

async function assertTargetRoles(client, target) {
  const result = await client.query(
    "SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])",
    [[target.deployerRole, target.runtimeRole]],
  );
  if (result.rows.length !== 2) fail("target Webshop deployer/runtime roles have not been provisioned.");
}

async function reconcileKnownLegacyConstraintNames(client) {
  for (const [table, legacyName, canonicalName] of LEGACY_CONSTRAINT_RENAMES) {
    await client.query(
      `ALTER TABLE webshop.${quoteWebshopIdentifier(table)} RENAME CONSTRAINT ${quoteWebshopIdentifier(legacyName)} TO ${quoteWebshopIdentifier(canonicalName)}`,
    );
  }
}

async function collectBusinessEvidence(client, schema, manifest) {
  const rowCounts = [];
  for (const table of [...manifest.relocatedBusinessTables].sort()) {
    const result = await client.query(
      `SELECT count(*)::text AS count FROM ${quoteWebshopIdentifier(schema)}.${quoteWebshopIdentifier(table)}`,
    );
    rowCounts.push({ table, count: result.rows[0]?.count ?? "0" });
  }
  return Object.freeze({
    aggregateSha256: sha256(canonicalJson({ rowCounts })),
    rowCounts,
    schema,
  });
}

async function assertCanonicalPrivileges(client, target, manifest) {
  const ownerRows = await client.query(`
    SELECT n.nspname AS schema_name, pg_get_userbyid(n.nspowner) AS owner
      FROM pg_namespace n WHERE n.nspname = 'webshop'
    UNION ALL
    SELECT c.relname AS schema_name, pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'webshop' AND c.relkind IN ('r', 'p', 'S')
     ORDER BY schema_name
  `);
  if (
    ownerRows.rows.length !== 48 ||
    ownerRows.rows.some((row) => row.owner !== target.deployerRole)
  ) {
    fail("Webshop schema object ownership does not match the target deployer role.");
  }

  const grants = await client.query(`
    SELECT c.relname,
           has_table_privilege($1, c.oid, 'SELECT') AS can_select,
           has_table_privilege($1, c.oid, 'INSERT') AS can_insert,
           has_table_privilege($1, c.oid, 'UPDATE') AS can_update,
           has_table_privilege($1, c.oid, 'DELETE') AS can_delete
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'webshop' AND c.relkind IN ('r', 'p')
     ORDER BY c.relname
  `, [target.runtimeRole]);
  if (
    grants.rows.length !== 47 ||
    grants.rows.some((row) => !row.can_select || !row.can_insert || !row.can_update || !row.can_delete)
  ) {
    fail("Webshop runtime table grants do not match the privilege manifest.");
  }

  const schemaAndHostGrants = await client.query(`
    SELECT
      has_schema_privilege($1, 'webshop', 'USAGE') AS runtime_webshop_usage,
      NOT EXISTS (
        SELECT 1
          FROM pg_namespace n
          CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) AS x
         WHERE n.nspname = 'webshop' AND x.grantee = 0 AND x.privilege_type = 'USAGE'
      ) AS public_webshop_usage_denied,
      has_schema_privilege($2, 'public', 'USAGE') AS deployer_public_usage,
      has_column_privilege($2, 'public.content', 'id', 'REFERENCES') AS content_references,
      has_column_privilege($2, 'public.files', 'id', 'REFERENCES') AS files_references,
      has_column_privilege($2, 'public.galleries', 'id', 'REFERENCES') AS galleries_references
  `, [target.runtimeRole, target.deployerRole]);
  const schemaGrant = schemaAndHostGrants.rows[0];
  if (
    !schemaGrant?.runtime_webshop_usage ||
    !schemaGrant.public_webshop_usage_denied ||
    !schemaGrant.deployer_public_usage ||
    !schemaGrant.content_references ||
    !schemaGrant.files_references ||
    !schemaGrant.galleries_references
  ) {
    fail(
      `Webshop schema or host REFERENCES grants do not match the privilege manifest (${JSON.stringify(schemaGrant)}).`,
    );
  }

  const defaultPrivileges = await client.query(`
    SELECT DISTINCT x.privilege_type
      FROM pg_default_acl d
      JOIN pg_roles owner ON owner.oid = d.defaclrole
      CROSS JOIN LATERAL aclexplode(d.defaclacl) AS x
      JOIN pg_roles grantee ON grantee.oid = x.grantee
     WHERE d.defaclnamespace = 'webshop'::regnamespace
       AND d.defaclobjtype = 'r'
       AND owner.rolname = $1
       AND grantee.rolname = $2
     ORDER BY x.privilege_type
  `, [target.deployerRole, target.runtimeRole]);
  const expectedDefaultPrivileges = ["DELETE", "INSERT", "SELECT", "UPDATE"];
  if (
    JSON.stringify(defaultPrivileges.rows.map((row) => row.privilege_type)) !==
    JSON.stringify(expectedDefaultPrivileges)
  ) {
    fail("Webshop default runtime table privileges do not match the privilege manifest.");
  }

  const expectedObjectNames = new Set([
    "webshops",
    "webshop_settings",
    ...manifest.relocatedBusinessTables,
  ]);
  if (grants.rows.some((row) => !expectedObjectNames.has(row.relname))) {
    fail("Webshop privilege reconciliation found an undeclared business object.");
  }
}

async function assertCanonicalPostcondition(client, target, manifest) {
  const classification = await classifyWebshopSchemaCutoverState(client, manifest);
  const schema = await inspectWebshopSchema(client, manifest);
  if (
    !classification.exactCanonical ||
    !schema.isExactCanonicalTableSet ||
    schema.publicLegacyTables.length
  ) {
    fail("canonical 47-table postcondition failed.");
  }
  if (schema.fingerprint !== manifest.postconditionSchemaFingerprintSha256) {
    fail(
      `canonical postcondition schema fingerprint does not match the signed manifest (observed ${schema.fingerprint}).`,
    );
  }
  await assertCanonicalPrivileges(client, target, manifest);
  return Object.freeze({
    ...classification,
    postconditionSchemaFingerprintSha256: schema.fingerprint,
    privilegeManifestHash: manifest.manifestHash,
  });
}

export async function runWebshopSchemaCutover(client, coreTarget, target, manifest) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `nr-cms:webshop-schema-cutover:${coreTarget.targetName}:v1`,
    ]);
    const beforeEvidence = await collectBusinessEvidence(client, "public", manifest);
    await client.query(`CREATE SCHEMA webshop AUTHORIZATION ${quoteWebshopIdentifier(target.deployerRole)}`);
    await client.query("REVOKE ALL ON SCHEMA webshop FROM PUBLIC");
    for (const table of manifest.relocatedBusinessTables) {
      await client.query(`ALTER TABLE public.${quoteWebshopIdentifier(table)} SET SCHEMA webshop`);
      await client.query(`ALTER TABLE webshop.${quoteWebshopIdentifier(table)} OWNER TO ${quoteWebshopIdentifier(target.deployerRole)}`);
    }
    await client.query(`
      ALTER TABLE webshop.webshop_license_servers
        ADD COLUMN IF NOT EXISTS auth_key_id text;
      DO $$
      BEGIN
        ALTER TABLE webshop.webshop_license_servers
          ADD CONSTRAINT webshop_license_servers_auth_key_id_format_check
          CHECK (auth_key_id IS NULL OR auth_key_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
      $$;
    `);
    await client.query(`
      CREATE TABLE webshop.webshops (
        id uuid PRIMARY KEY,
        content_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'active',
        archived_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT webshop_webshops_content_id_unique UNIQUE (content_id),
        CONSTRAINT webshop_webshops_status_check CHECK (status IN ('active','archived','disabled')),
        CONSTRAINT webshop_webshops_active_archive_check CHECK ((status <> 'active') OR archived_at IS NULL)
      )
    `);
    await client.query(`ALTER TABLE webshop.webshops ADD CONSTRAINT webshops_content_id_content_id_fk FOREIGN KEY (content_id) REFERENCES public.content(id) ON DELETE RESTRICT`);
    await client.query(`ALTER TABLE webshop.webshops OWNER TO ${quoteWebshopIdentifier(target.deployerRole)}`);
    await client.query("CREATE UNIQUE INDEX webshop_webshops_single_active_idx ON webshop.webshops (status) WHERE status = 'active'");
    await client.query(`
      CREATE TABLE webshop.webshop_settings (
        webshop_id uuid PRIMARY KEY,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        storefront_presets jsonb NOT NULL DEFAULT '{}'::jsonb,
        order_number_allocator jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE webshop.webshop_settings ADD CONSTRAINT webshop_settings_webshop_id_webshops_id_fk FOREIGN KEY (webshop_id) REFERENCES webshop.webshops(id) ON DELETE RESTRICT`);
    await client.query(`ALTER TABLE webshop.webshop_settings OWNER TO ${quoteWebshopIdentifier(target.deployerRole)}`);
    const sources = WEBSHOP_ID_TABLES.map((table) => `SELECT webshop_id FROM webshop.${quoteWebshopIdentifier(table)}`).join(" UNION ");
    await client.query(`
      INSERT INTO webshop.webshops (id, content_id)
      SELECT DISTINCT source.webshop_id, source.webshop_id
      FROM (${sources}) AS source
      JOIN public.content c ON c.id = source.webshop_id
      WHERE c.content_type = 'webshop'
    `);
    const invalid = await client.query(`
      SELECT 1 FROM (${sources}) AS source
      LEFT JOIN webshop.webshops w ON w.id = source.webshop_id
      WHERE w.id IS NULL LIMIT 1
    `);
    if (invalid.rowCount) fail("webshop_id does not resolve to a public.content row of content_type=webshop.");
    for (const table of WEBSHOP_ID_TABLES) {
      const constraints = await client.query(
        `SELECT conname FROM pg_constraint c
           JOIN pg_class r ON r.oid = c.conrelid
           JOIN pg_namespace n ON n.oid = r.relnamespace
          WHERE n.nspname = 'webshop' AND r.relname = $1 AND c.contype = 'f'
            AND pg_get_constraintdef(c.oid) LIKE '%(webshop_id)%'`,
        [table],
      );
      for (const row of constraints.rows) {
        await client.query(`ALTER TABLE webshop.${quoteWebshopIdentifier(table)} DROP CONSTRAINT ${quoteWebshopIdentifier(row.conname)}`);
      }
      await client.query(`ALTER TABLE webshop.${quoteWebshopIdentifier(table)} ADD CONSTRAINT ${quoteWebshopIdentifier(`${table}_webshop_id_webshops_id_fk`)} FOREIGN KEY (webshop_id) REFERENCES webshop.webshops(id) ON DELETE RESTRICT`);
    }
    await reconcileKnownLegacyConstraintNames(client);
    await client.query(
      "ALTER TABLE webshop.webshop_license_keys VALIDATE CONSTRAINT webshop_license_keys_encrypted_or_legacy_check",
    );
    await client.query(`
      INSERT INTO webshop.webshop_settings (webshop_id, settings, storefront_presets, order_number_allocator)
      SELECT w.id, COALESCE(e.metadata->'settings','{}'::jsonb), COALESCE(e.metadata->'storefrontPresets','{}'::jsonb), COALESCE(e.metadata->'orderNumberAllocator','{}'::jsonb)
      FROM webshop.webshops w CROSS JOIN public.webshop_addon_entitlements e
      WHERE e.id = 1
      ON CONFLICT (webshop_id) DO NOTHING
    `);
    await client.query(`UPDATE public.webshop_addon_entitlements SET metadata = metadata - $1 - $2 - $3 WHERE id = 1`, ALLOWED_METADATA_KEYS);
    await client.query(`
      CREATE OR REPLACE FUNCTION webshop.enforce_webshop_content_type() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.content WHERE id = NEW.content_id AND content_type = 'webshop') THEN
          RAISE EXCEPTION 'webshop content_id must reference public.content with content_type=webshop' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE CONSTRAINT TRIGGER webshop_webshops_content_type_trigger
      AFTER INSERT OR UPDATE OF content_id ON webshop.webshops DEFERRABLE INITIALLY IMMEDIATE
      FOR EACH ROW EXECUTE FUNCTION webshop.enforce_webshop_content_type();
      CREATE OR REPLACE FUNCTION webshop.deny_financial_history_delete() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Webshop financial and order history is immutable; use lifecycle state transitions.' USING ERRCODE = '55000';
      END;
      $$;
      CREATE TRIGGER webshop_orders_delete_denied BEFORE DELETE ON webshop.webshop_orders FOR EACH ROW EXECUTE FUNCTION webshop.deny_financial_history_delete();
      CREATE TRIGGER webshop_payments_delete_denied BEFORE DELETE ON webshop.webshop_payments FOR EACH ROW EXECUTE FUNCTION webshop.deny_financial_history_delete();
      CREATE TRIGGER webshop_refunds_delete_denied BEFORE DELETE ON webshop.webshop_refunds FOR EACH ROW EXECUTE FUNCTION webshop.deny_financial_history_delete();
      CREATE TRIGGER webshop_fulfillments_delete_denied BEFORE DELETE ON webshop.webshop_fulfillments FOR EACH ROW EXECUTE FUNCTION webshop.deny_financial_history_delete();
      CREATE TRIGGER webshop_license_keys_delete_denied BEFORE DELETE ON webshop.webshop_license_keys FOR EACH ROW EXECUTE FUNCTION webshop.deny_financial_history_delete();
      CREATE TRIGGER webshop_download_entitlements_delete_denied BEFORE DELETE ON webshop.webshop_download_entitlements FOR EACH ROW EXECUTE FUNCTION webshop.deny_financial_history_delete();
      ALTER FUNCTION webshop.enforce_webshop_content_type() OWNER TO ${quoteWebshopIdentifier(target.deployerRole)};
      ALTER FUNCTION webshop.deny_financial_history_delete() OWNER TO ${quoteWebshopIdentifier(target.deployerRole)};
    `);
    await client.query(`GRANT USAGE ON SCHEMA webshop TO ${quoteWebshopIdentifier(target.runtimeRole)}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA webshop TO ${quoteWebshopIdentifier(target.runtimeRole)}`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA webshop TO ${quoteWebshopIdentifier(target.runtimeRole)}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteWebshopIdentifier(target.deployerRole)} IN SCHEMA webshop GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteWebshopIdentifier(target.runtimeRole)}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteWebshopIdentifier(target.deployerRole)} IN SCHEMA webshop GRANT USAGE, SELECT ON SEQUENCES TO ${quoteWebshopIdentifier(target.runtimeRole)}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteWebshopIdentifier(target.deployerRole)}`);
    await client.query(`GRANT REFERENCES (id) ON TABLE public.content, public.files, public.galleries TO ${quoteWebshopIdentifier(target.deployerRole)}`);
    const afterEvidence = await collectBusinessEvidence(client, "webshop", manifest);
    if (canonicalJson(beforeEvidence.rowCounts) !== canonicalJson(afterEvidence.rowCounts)) {
      fail("Webshop business row counts changed during schema cutover.");
    }
    const after = await assertCanonicalPostcondition(client, target, manifest);
    await client.query(
      `INSERT INTO public.cms_addon_migrations (addon_key, migration_id, checksum, package_version, schema_version, status, applied_at)
       VALUES ('webshop', '0002_webshop_schema_cutover', $1, 'operator-cutover', 2, 'legacy_applied', now())
       ON CONFLICT (addon_key, migration_id) DO NOTHING`,
      [manifest.manifestHash],
    );
    await client.query("COMMIT");
    return { ...after, beforeEvidence, afterEvidence };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

export async function executeWebshopSchemaCutover({
  apply,
  client,
  coreTarget,
  manifest,
  target,
}) {
  await assertTargetRoles(client, target);
  const before = await classifyWebshopSchemaCutoverState(client, manifest);
  if (before.exactCanonical) {
    const postcondition = await assertCanonicalPostcondition(client, target, manifest);
    return {
      operation: "idempotent",
      target: coreTarget.targetName,
      manifestHash: manifest.manifestHash,
      ...postcondition,
    };
  }
  if (!before.exactLegacy || !apply) {
    return {
      operation: "operator_schema_cutover_required",
      target: coreTarget.targetName,
      manifestHash: manifest.manifestHash,
      ...before,
    };
  }
  const after = await runWebshopSchemaCutover(client, coreTarget, target, manifest);
  return {
    operation: "legacy_applied",
    target: coreTarget.targetName,
    manifestHash: manifest.manifestHash,
    ...after,
  };
}

export async function webshopSchemaCutover(argv = process.argv.slice(2)) {
  const parsed = readArguments(argv);
  const manifest = loadWebshopSchemaManifest();
  if (parsed.values.get("--expected-manifest-sha256") !== manifest.manifestHash) {
    fail("--expected-manifest-sha256 does not match WebshopSchemaPrivilegeManifestV1.");
  }
  assertWindowsAdministrator();
  const coreTarget = resolveCmsCoreTarget(parsed.values.get("--target"));
  const target = resolveWebshopTarget(coreTarget.targetName, manifest);
  if (parsed.flags.has("--apply")) assertBackupReceipt(parsed.values.get("--backup-receipt-file"));
  const { password } = readProtectedOperatorPasswordFile(ADMIN_PASSWORD_FILE);
  const client = new Client({ connectionString: buildLocalDatabaseUrl(coreTarget, "postgres", password) });
  await client.connect();
  try {
    return executeWebshopSchemaCutover({
      apply: parsed.flags.has("--apply"),
      client,
      coreTarget,
      manifest,
      target,
    });
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("db-webshop-schema-cutover.mjs")) {
  webshopSchemaCutover().then((receipt) => console.log(JSON.stringify(receipt))).catch((error) => {
    console.error(error instanceof Error ? error.message : "[webshop-schema-cutover] failed.");
    process.exitCode = 1;
  });
}
