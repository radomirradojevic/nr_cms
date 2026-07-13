import process from "node:process";

import pg from "pg";

import { assertSafeTestDatabaseUrl } from "./database-test-safety.mjs";

const staging = process.argv.includes("--staging");
const local = process.argv.includes("--local");
if (staging && local)
  throw new Error("[invariants] --staging and --local are mutually exclusive.");
if (staging && process.env.NR_ACCEPTANCE_TARGET !== "staging") {
  throw new Error(
    "[invariants] --staging requires NR_ACCEPTANCE_TARGET=staging.",
  );
}
if (local && process.env.NR_ACCEPTANCE_TARGET !== "local")
  throw new Error("[invariants] --local requires NR_ACCEPTANCE_TARGET=local.");
const connectionString = staging
  ? requireStagingDatabaseUrl(
      process.env.NR_ACCEPTANCE_CMS_DATABASE_URL,
      "NR_ACCEPTANCE_CMS_DATABASE_URL",
    )
  : local
    ? assertSafeTestDatabaseUrl(
        process.env.NR_ACCEPTANCE_CMS_TEST_DATABASE_URL,
        "NR_ACCEPTANCE_CMS_TEST_DATABASE_URL",
      )
    : assertSafeTestDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
const centralConnectionString = staging
  ? requireStagingDatabaseUrl(
      process.env.NR_ACCEPTANCE_CENTRAL_DATABASE_URL,
      "NR_ACCEPTANCE_CENTRAL_DATABASE_URL",
    )
  : local
    ? assertSafeTestDatabaseUrl(
        process.env.NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL,
        "NR_ACCEPTANCE_CENTRAL_TEST_DATABASE_URL",
      )
    : null;

const checks = [
  {
    id: "completed_order_without_required_fulfillment",
    sql: `
      SELECT count(*)::integer AS violations
      FROM webshop_orders orders
      JOIN webshop_order_items items ON items.order_id = orders.id
      WHERE orders.status = 'completed'
        AND items.fulfillment_status NOT IN ('fulfilled', 'not_required')
    `,
  },
  {
    id: "refunded_or_chargeback_order_with_active_desired_entitlement",
    sql: `
      SELECT count(*)::integer AS violations
      FROM webshop_license_server_issues issue
      JOIN webshop_orders orders ON orders.id = issue.order_id
      WHERE orders.payment_status IN ('refunded', 'chargeback')
        AND issue.desired_status = 'active'
    `,
  },
  {
    id: "stale_processing_operation_lease",
    sql: `
      SELECT count(*)::integer AS violations
      FROM webshop_license_server_operations
      WHERE status = 'processing'
        AND lease_expires_at < now()
    `,
  },
  {
    id: "paid_license_issue_without_terminal_fulfillment",
    sql: `
      SELECT count(*)::integer AS violations
      FROM webshop_license_server_issues issue
      JOIN webshop_orders orders ON orders.id = issue.order_id
      WHERE orders.payment_status = 'paid'
        AND issue.status IN ('failed', 'canceled')
        AND issue.desired_status = 'active'
    `,
  },
  {
    id: "dead_letter_without_visible_issue_state",
    sql: `
      SELECT count(*)::integer AS violations
      FROM webshop_license_server_operations operation
      JOIN webshop_license_server_issues issue ON issue.id = operation.issue_id
      WHERE operation.status = 'dead_letter'
        AND issue.status NOT IN ('failed', 'canceled')
    `,
  },
];

const centralChecks = [
  {
    id: "duplicate_vendor_business_entitlement",
    sql: `
      SELECT count(*)::integer AS violations
      FROM (
        SELECT api_client_id, order_item_ref, sku_id
        FROM licenses
        WHERE order_item_ref IS NOT NULL
        GROUP BY api_client_id, order_item_ref, sku_id
        HAVING count(*) > 1
      ) duplicates
    `,
  },
  {
    id: "activation_limit_exceeded",
    sql: `
      SELECT count(*)::integer AS violations
      FROM licenses license
      JOIN vendor_entitlement_activations activation ON activation.entitlement_id = license.id
      WHERE activation.status = 'active'
      GROUP BY license.id, license.activation_limit
      HAVING count(*) > license.activation_limit
    `,
  },
  {
    id: "addon_activation_limit_exceeded",
    sql: `
      SELECT count(*)::integer AS violations
      FROM licenses entitlement
      JOIN (
        SELECT entitlement_id, count(*)::integer AS active_count
        FROM vendor_addon_activations
        WHERE status = 'active'
        GROUP BY entitlement_id
      ) activation ON activation.entitlement_id = entitlement.id
      WHERE activation.active_count > entitlement.activation_limit
    `,
  },
];

const pool = new pg.Pool({ connectionString, max: 1 });
let failed = false;

try {
  for (const check of checks) {
    const result = await pool.query(check.sql);
    const violations = Number(result.rows[0]?.violations ?? 0);
    failed ||= violations !== 0;
    console.log(JSON.stringify({ check: check.id, violations }));
  }
} finally {
  await pool.end();
}

if (centralConnectionString) {
  const centralPool = new pg.Pool({
    connectionString: centralConnectionString,
    max: 1,
  });
  try {
    for (const check of centralChecks) {
      const result = await centralPool.query(check.sql);
      const violations = Number(result.rows[0]?.violations ?? 0);
      failed ||= violations !== 0;
      console.log(JSON.stringify({ check: check.id, violations }));
    }
  } finally {
    await centralPool.end();
  }
}

if (failed) process.exitCode = 1;

function requireStagingDatabaseUrl(value, label) {
  if (!value)
    throw new Error(
      `[invariants] ${label} is required for staging invariants.`,
    );
  const url = new URL(value);
  if (
    !/^postgres(?:ql)?:$/.test(url.protocol) ||
    !url.hostname ||
    /localhost|127\.0\.0\.1|\.local$/i.test(url.hostname)
  ) {
    throw new Error(
      `[invariants] ${label} must be a non-local PostgreSQL staging target.`,
    );
  }
  return value;
}
