import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const PRODUCTION_AUDIT_VERSION = 2;

const GROUPS = {
  ARCH: 6,
  PKG: 6,
  DATA: 4,
  PROF: 3,
  CLAIM: 5,
  ISSUE: 6,
  LIFE: 2,
  WEB: 8,
  CRYPTO: 5,
  RUN: 4,
  SEC: 5,
  OPS: 5,
  DX: 5,
  PERF: 4,
};

export const DOCS_11_CRITERIA = Object.entries(GROUPS).flatMap(
  ([prefix, count]) =>
    Array.from(
      { length: count },
      (_, index) => `${prefix}-${String(index + 1).padStart(2, "0")}`,
    ),
);

export const FINAL_PACKAGE_COMPONENT_GATES = [
  "public_copy",
  "signed_private_packages",
  "central_runtime",
  "security_redaction",
  "migration_and_invariants",
];

const INTEGRATION_REQUIREMENTS = {
  "ARCH-04": { scenarios: ["customer_webshop_remote_hmac_paid_delivery"] },
  "ARCH-05": {
    scenarios: [
      "customer_webshop_local_paid_delivery",
      "customer_webshop_remote_hmac_paid_delivery",
    ],
  },
  "ARCH-06": { scenarios: ["master_outage"] },
  "PKG-05": { scenarios: ["license_server_addon_purchase"] },
  "PKG-06": {
    scenarios: ["license_server_install_without_customer_webshop"],
  },
  "DATA-02": { drills: ["previous_package_upgrade"] },
  "DATA-03": { drills: ["application_rollback_compatibility"] },
  "ISSUE-01": { scenarios: ["concurrent_duplicate_issue_100"] },
  "ISSUE-02": { scenarios: ["concurrent_duplicate_issue_100"] },
  "ISSUE-03": { scenarios: ["idempotency_replay_conflict"] },
  "ISSUE-04": {
    scenarios: [
      "timeout_before_issue_commit",
      "response_loss_after_commit",
      "process_restart",
      "database_restart",
      "stale_worker_recovery",
    ],
  },
  "ISSUE-05": { drills: ["queue_recovery"] },
  "LIFE-01": {
    scenarios: ["renewal", "refund", "chargeback", "revocation"],
  },
  "LIFE-02": {
    scenarios: ["refund", "chargeback", "offline_grace_after_refund"],
  },
  "WEB-01": {
    scenarios: [
      "customer_webshop_local_paid_delivery",
      "customer_webshop_remote_hmac_paid_delivery",
    ],
  },
  "WEB-03": { scenarios: ["issuer_ref_mismatch"] },
  "WEB-04": { scenarios: ["catalog_revision_change"] },
  "WEB-06": {
    scenarios: [
      "process_restart",
      "database_restart",
      "delivery_failure_retry",
    ],
  },
  "WEB-07": {
    scenarios: [
      "customer_webshop_local_paid_delivery",
      "customer_webshop_remote_hmac_paid_delivery",
      "delivery_failure_retry",
    ],
  },
  "CRYPTO-03": { scenarios: ["vendor_signing_key_rotation"] },
  "CRYPTO-04": { drills: ["encrypted_db_key_backup_restore"] },
  "RUN-01": { scenarios: ["concurrent_activation_limit_100"] },
  "RUN-03": { scenarios: ["offline_grace_after_refund"] },
  "RUN-04": { scenarios: ["refund", "chargeback", "revocation"] },
  "SEC-03": {
    scenarios: [
      "persistent_rate_limit_load",
      "concurrent_activation_limit_100",
    ],
  },
  "OPS-01": {
    scenarios: ["delivery_failure_retry", "queue_backpressure_soak"],
    drills: ["queue_recovery"],
  },
  "OPS-02": { drills: ["alert_delivery"] },
  "OPS-03": { drills: ["encrypted_db_key_backup_restore"] },
  "OPS-04": { scenarios: ["master_outage", "issuer_outage"] },
  "OPS-05": { drills: ["incident_tabletop"] },
  "PERF-01": { scenarios: ["issue_validate_p95"] },
  "PERF-02": {
    scenarios: [
      "concurrent_duplicate_issue_100",
      "concurrent_activation_limit_100",
    ],
  },
  "PERF-03": { scenarios: ["queue_backpressure_soak"] },
  "PERF-04": { scenarios: ["keyset_catalog_cache_load"] },
};

export const DOCS_11_REQUIREMENTS = Object.fromEntries(
  DOCS_11_CRITERIA.map((id) => [
    id,
    {
      components: FINAL_PACKAGE_COMPONENT_GATES,
      scenarios: INTEGRATION_REQUIREMENTS[id]?.scenarios ?? [],
      drills: INTEGRATION_REQUIREMENTS[id]?.drills ?? [],
    },
  ]),
);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function passedIds(entries) {
  return new Set(
    entries
      .filter((entry) => entry?.status === "passed" || entry?.status === "PASS")
      .map((entry) => entry.id ?? entry.scenario),
  );
}

function evidenceReference(kind, id, entries) {
  const entry = entries.find(
    (candidate) => (candidate.id ?? candidate.scenario) === id,
  );
  return entry?.evidenceSha256
    ? `${kind}/${id}.json#sha256=${entry.evidenceSha256}`
    : `${kind}/${id}.json`;
}

export function buildProductionAcceptanceAudit({
  target,
  componentGates = [],
  stagingScenarios = [],
  operatorDrills = [],
  localDiagnostics = [],
  artifactSet = null,
  completedAt = new Date().toISOString(),
} = {}) {
  if (target !== "local" && target !== "staging")
    throw new Error("production audit target must be local or staging");
  const componentPass = passedIds(componentGates);
  const scenarioPass = passedIds(stagingScenarios);
  const drillPass = passedIds(operatorDrills);
  const criteria = DOCS_11_CRITERIA.map((id) => {
    const requirement = DOCS_11_REQUIREMENTS[id];
    const missingComponents = requirement.components.filter(
      (entry) => !componentPass.has(entry),
    );
    const missingScenarios = requirement.scenarios.filter(
      (entry) => !scenarioPass.has(entry),
    );
    const missingDrills = requirement.drills.filter(
      (entry) => !drillPass.has(entry),
    );
    const missing = [
      ...missingComponents.map((entry) => `component:${entry}`),
      ...missingScenarios.map((entry) => `staging-e2e:${entry}`),
      ...missingDrills.map((entry) => `operator-drill:${entry}`),
    ];
    return {
      id,
      status: missing.length === 0 ? "PASS" : "NO_GO",
      evidence: [
        ...requirement.components
          .filter((entry) => componentPass.has(entry))
          .map((entry) =>
            evidenceReference("component", entry, componentGates),
          ),
        ...requirement.scenarios
          .filter((entry) => scenarioPass.has(entry))
          .map((entry) =>
            evidenceReference("staging-e2e", entry, stagingScenarios),
          ),
        ...requirement.drills
          .filter((entry) => drillPass.has(entry))
          .map((entry) =>
            evidenceReference("operator-drill", entry, operatorDrills),
          ),
      ],
      ...(missing.length > 0
        ? { reason: `Missing mandatory proof: ${missing.join(", ")}.` }
        : {}),
    };
  });
  const noGoCriteria = criteria
    .filter((entry) => entry.status === "NO_GO")
    .map((entry) => entry.id);
  const decision =
    target === "staging" && noGoCriteria.length === 0 ? "GO" : "NO_GO";
  const report = {
    version: PRODUCTION_AUDIT_VERSION,
    target,
    decision,
    completedAt,
    artifactSet,
    criteria,
    summary: {
      total: criteria.length,
      passed: criteria.length - noGoCriteria.length,
      noGo: noGoCriteria.length,
      noGoCriteria,
      localDiagnosticCount: localDiagnostics.length,
      localDiagnosticsGateEligible: false,
    },
  };
  return {
    ...report,
    reportSha256: sha256(JSON.stringify(report)),
  };
}

export async function writeProductionAcceptanceAudit(path, input) {
  const report = buildProductionAcceptanceAudit(input);
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return { path: absolutePath, report };
}
