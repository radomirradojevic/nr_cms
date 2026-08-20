import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "contracts",
  "webshop-schema-manifest-v1.json",
);
const identifier = /^[a-z_][a-z0-9_]{0,62}$/;

function fail(message) {
  throw new Error(`[webshop-schema] ${message}`);
}

export function canonicalJson(value) {
  if (Array.isArray(value))
    return JSON.stringify(
      value.map((entry) => JSON.parse(canonicalJson(entry))),
    );
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, JSON.parse(canonicalJson(value[key]))]),
    ),
  );
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function quoteWebshopIdentifier(value) {
  if (!identifier.test(value))
    fail("static contract contains an invalid PostgreSQL identifier.");
  return `"${value}"`;
}

export function loadWebshopSchemaManifest() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    fail("WebshopSchemaPrivilegeManifestV1 is missing or invalid JSON.");
  }
  if (
    manifest?.manifestType !== "WebshopSchemaPrivilegeManifestV1" ||
    manifest?.contractVersion !== 1 ||
    manifest?.version !== "WebshopSchemaFingerprintV1" ||
    manifest?.ownedSchema !== "webshop" ||
    !/^[a-f0-9]{64}$/.test(
      manifest?.postconditionSchemaFingerprintSha256 ?? "",
    ) ||
    !/^[a-f0-9]{64}$/.test(
      manifest?.legacyPublicSchemaFingerprintSha256 ?? "",
    ) ||
    !Array.isArray(manifest.relocatedBusinessTables) ||
    manifest.relocatedBusinessTables.length !== 45
  ) {
    fail("WebshopSchemaPrivilegeManifestV1 has an unsupported shape.");
  }
  const tableSet = new Set(manifest.relocatedBusinessTables);
  if (
    tableSet.size !== 45 ||
    [...tableSet].some((table) => !/^webshop_[a-z0-9_]+$/.test(table))
  ) {
    fail(
      "WebshopSchemaPrivilegeManifestV1 must contain exactly the static 45-table allowlist.",
    );
  }
  for (const target of ["vendor", "client", "paypal"]) {
    const roles = manifest.targets?.[target];
    if (!roles) fail(`WebshopSchemaPrivilegeManifestV1 is missing ${target}.`);
    quoteWebshopIdentifier(roles.deployerRole);
    quoteWebshopIdentifier(roles.runtimeRole);
  }
  return Object.freeze({
    ...manifest,
    manifestHash: sha256(canonicalJson(manifest)),
  });
}

export function resolveWebshopTarget(
  target,
  manifest = loadWebshopSchemaManifest(),
) {
  if (!["vendor", "client", "paypal"].includes(target))
    fail("--target must be exactly vendor, client, or paypal.");
  return Object.freeze({
    ...manifest.targets[target],
    manifestHash: manifest.manifestHash,
    target,
  });
}

export const WEBSHOP_CANONICAL_TABLES = Object.freeze([
  "webshops",
  "webshop_settings",
  ...loadWebshopSchemaManifest().relocatedBusinessTables,
]);

/** Post-baseline package schema. The 47-table V1 manifest remains the only
 * legal empty/legacy cutover boundary; later signed migrations extend it. */
export const WEBSHOP_CURRENT_TABLES = Object.freeze([
  ...WEBSHOP_CANONICAL_TABLES,
  "webshop_license_claim_mapping_revisions",
  "webshop_license_server_connection_catalog_profiles",
  "webshop_license_server_connection_catalog_revisions",
  "webshop_license_server_connection_product_bindings",
  "webshop_license_server_connections",
  "webshop_license_product_catalog_bindings",
  "webshop_license_server_catalog_revisions",
  "webshop_payment_capture_evidence",
  "webshop_payment_session_operations",
  "webshop_post_issue_compensation_decisions",
  "webshop_post_issue_license_observations",
  "webshop_license_delivery_notifications",
  "webshop_license_delivery_tokens",
  "webshop_purchase_intent_keysets",
  "webshop_purchase_intent_operations",
  "webshop_purchase_intent_sessions",
  "webshop_purchase_intents",
]);
