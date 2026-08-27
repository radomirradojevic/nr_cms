import "dotenv/config";

import { lstatSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const args = exactArguments(process.argv.slice(2));
if (!args.apply) {
  throw new Error(
    "usage: npm run vendor:master:provision -- --apply --actor-id <cms-user-id> --credential-file <absolute-json-file>",
  );
}
if (process.env.NR_CMS_DEPLOYMENT_PROFILE !== "vendor") {
  throw new Error("vendor_master_provision_requires_vendor_profile");
}
if (process.env.NR_LICENSE_ENVIRONMENT !== "production") {
  throw new Error("vendor_master_provision_requires_production_environment");
}

const credential = readCredential(args.credentialFile);
const {
  createWebshopLicenseServer,
  listWebshopLicenseServers,
  updateWebshopLicenseServer,
} = await import(
  "../.private/webshop/src/data/webshop-license-servers.ts"
);
const { syncWebshopLicenseServerCatalog } = await import(
  "../.private/webshop/src/data/webshop-license-server-catalog.ts"
);

const title = "Night Raven Master License Server";
const baseApiUrl = "https://ls.nrcms.com/api/v1";
const listed = await listWebshopLicenseServers({
  page: 1,
  pageSize: 100,
  search: title,
  status: "all",
  visibility: "all",
});
const matches = listed.rows.filter((row) => row.title === title);
if (matches.length > 1) throw new Error("vendor_master_connection_ambiguous");

const connection = matches[0]
  ? await updateWebshopLicenseServer({
      actorId: args.actorId,
      authClientId: credential.clientId,
      authKeyId: credential.hmacKeyId,
      authSecret: credential.hmacSecret,
      baseApiUrl,
      id: matches[0].id,
      showInPolicyMenu: true,
      status: "active",
      title,
    })
  : await createWebshopLicenseServer({
      actorId: args.actorId,
      authClientId: credential.clientId,
      authKeyId: credential.hmacKeyId,
      authSecret: credential.hmacSecret,
      baseApiUrl,
      showInPolicyMenu: true,
      status: "active",
      title,
    });
if (!connection) throw new Error("vendor_master_connection_update_failed");

const sync = await syncWebshopLicenseServerCatalog({
  actorId: args.actorId,
  licenseServerId: connection.id,
});
if (!sync.ok) throw new Error(`vendor_master_catalog_sync_failed:${sync.error}`);
if (sync.itemCount !== 8 || sync.server.catalogEnvironment !== "production") {
  throw new Error("vendor_master_catalog_shape_invalid");
}

process.stdout.write(
  `${JSON.stringify({
    baseApiUrl,
    catalogVersion: sync.catalogVersion,
    connectionId: connection.id,
    environment: sync.server.catalogEnvironment,
    itemCount: sync.itemCount,
    purpose: "nr_vendor_master_connection_status",
  })}\n`,
);

function exactArguments(argv) {
  if (argv.length !== 5 || argv[0] !== "--apply") {
    return { apply: false };
  }
  const values = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (
      !["--actor-id", "--credential-file"].includes(key) ||
      !value ||
      values.has(key)
    ) {
      return { apply: false };
    }
    values.set(key, value);
  }
  const actorId = values.get("--actor-id")?.trim();
  const credentialFile = values.get("--credential-file")?.trim();
  if (!actorId || actorId.length > 200 || !credentialFile) {
    return { apply: false };
  }
  return { actorId, apply: true, credentialFile };
}

function readCredential(path) {
  if (!isAbsolute(path)) throw new Error("credential_file_must_be_absolute");
  const normalized = resolve(path);
  const stat = lstatSync(normalized);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 64 || stat.size > 64 * 1024) {
    throw new Error("credential_file_invalid");
  }
  if (process.platform !== "win32" && (stat.mode & 0o077) !== 0) {
    throw new Error("credential_file_must_be_operator_only");
  }
  const value = JSON.parse(readFileSync(normalized, "utf8"));
  const keys = Object.keys(value).sort();
  const expected = [
    "apiClientDatabaseId",
    "clientId",
    "contractVersion",
    "environment",
    "hmacKeyId",
    "hmacSecret",
    "offers",
    "purpose",
    "vendorAudience",
  ].sort();
  if (
    JSON.stringify(keys) !== JSON.stringify(expected) ||
    value.contractVersion !== 1 ||
    value.environment !== "production" ||
    value.purpose !== "nr_vendor_commerce_credential" ||
    value.vendorAudience !== "https://vendor.nrcms.com" ||
    !safe(value.clientId, 200) ||
    !safe(value.hmacKeyId, 120) ||
    !safe(value.hmacSecret, 4096) ||
    !Array.isArray(value.offers) ||
    value.offers.length !== 2
  ) {
    throw new Error("credential_file_contract_invalid");
  }
  return value;
}

function safe(value, max) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
