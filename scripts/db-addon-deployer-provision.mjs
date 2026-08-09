import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import pg from "pg";

import {
  buildLocalDatabaseUrl,
  loadCmsCorePrivilegeManifest,
  parseStrictArguments,
  quoteIdentifier,
  resolveCmsCoreTarget,
} from "./core-db-contract.mjs";
import {
  assertProtectedOperatorPasswordFile,
  assertWindowsAdministrator,
  readProtectedOperatorPasswordFile,
} from "./core-db-provisioning.mjs";
import { canonicalJson, sha256, WEBSHOP_CURRENT_TABLES } from "./webshop-schema-contract.mjs";

const { Client } = pg;
const DPAPI_HELPER = path.resolve("scripts", "windows-addon-deployer-dpapi.ps1");
const CONTROL_TABLES = Object.freeze([
  "cms_addon_deployment_candidates",
  "cms_addon_deployment_terminal_receipts",
  "cms_addon_installations",
  "cms_addon_migrations",
  "cms_addon_operations",
  "cms_addon_serving_fences",
]);

function fail(message) { throw new Error(`[addon-deployer-provision] ${message}`); }

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object.`);
  const actual = Object.keys(value).sort(); const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(`${label} has unknown or missing fields.`);
}

function readArguments(argv) {
  const parsed = parseStrictArguments(argv, [
    "--target", "--expected-manifest-sha256", "--privilege-manifest-file",
    "--admin-password-file", "--password-file",
  ], ["--apply", "--dry-run"]);
  for (const key of ["--target", "--expected-manifest-sha256", "--privilege-manifest-file", "--admin-password-file", "--password-file"]) {
    if (!parsed.values.has(key)) fail(`${key} is required.`);
  }
  if (parsed.flags.size !== 1) fail("exactly one of --apply or --dry-run is required.");
  return parsed;
}

function loadPrivilegeManifest(file, expectedHash, targetName, coreTarget) {
  if (!path.isAbsolute(file) || !/^[a-f0-9]{64}$/.test(expectedHash)) fail("privilege manifest path/hash is invalid.");
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 128 * 1024) fail("privilege manifest must be a bounded regular file.");
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expectedHash) fail("privilege manifest hash mismatch.");
  const value = JSON.parse(bytes.toString("utf8"));
  exactKeys(value, ["allowedPublicReferenceTables","contractVersion","databaseResourceId","deployerRole","grantReconcilerVersion","purpose","runtimeRole","runtimeSequencePrivileges","runtimeTablePrivileges","schema","sequenceNames","tableNames","targetProfile"], "privilege manifest");
  if (canonicalJson(value) !== bytes.toString("utf8").trim()) fail("privilege manifest is not canonical JSON.");
  const expectedTables = [...WEBSHOP_CURRENT_TABLES].sort();
  if (value.contractVersion !== 1 || value.purpose !== "webshop_migration_privilege_manifest" || value.targetProfile !== targetName || value.databaseResourceId !== coreTarget.databaseResourceId || value.schema !== "webshop" || value.deployerRole !== `nr_cms_${targetName}_webshop_deployer` || value.runtimeRole !== coreTarget.roles.runtime || value.grantReconcilerVersion !== 1) fail("privilege manifest identity mismatch.");
  if (canonicalJson(value.tableNames) !== canonicalJson(expectedTables) || canonicalJson(value.sequenceNames) !== "[]" || canonicalJson(value.allowedPublicReferenceTables) !== canonicalJson(["content","files","galleries"]) || canonicalJson(value.runtimeTablePrivileges) !== canonicalJson(["SELECT","INSERT","UPDATE","DELETE"]) || canonicalJson(value.runtimeSequencePrivileges) !== canonicalJson(["USAGE","SELECT"])) fail("privilege manifest grant set mismatch.");
  return { value, sha256: expectedHash };
}

async function roleState(client, role) {
  const result = await client.query("SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=$1", [role]);
  return result.rows[0] ?? null;
}

async function setPassword(client, role, password) {
  const setting = `nr_addon_deployer.password_${role}`;
  try {
    await client.query("SELECT set_config($1,$2,false)", [setting, password]);
    await client.query(`DO $$ BEGIN EXECUTE 'ALTER ROLE ${quoteIdentifier(role)} PASSWORD ' || quote_literal(current_setting('${setting}')); END $$;`);
  } finally { await client.query("SELECT set_config($1,'',false)", [setting]); }
}

async function ensureRole(client, role, password) {
  const existing = await roleState(client, role);
  const expected = { rolcanlogin: true, rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false, rolbypassrls: false, rolinherit: false };
  if (!existing) {
    await client.query(`CREATE ROLE ${quoteIdentifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    await setPassword(client, role, password);
    return "created";
  }
  for (const [key, expectedValue] of Object.entries(expected)) if (Boolean(existing[key]) !== expectedValue) fail(`existing deployer role has unexpected ${key}.`);
  const membership = await client.query("SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=$1", [role]);
  if (membership.rowCount) fail("existing deployer role has forbidden membership.");
  return "adopted";
}

async function requireTables(client, schema, tables) {
  const result = await client.query("SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename=ANY($2::text[]) ORDER BY tablename", [schema, tables]);
  if (result.rows.length !== tables.length) fail(`required ${schema} table set is incomplete.`);
}

async function reconcileDatabase(client, coreTarget, manifest, password) {
  const { deployerRole, runtimeRole } = manifest;
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [`nr-cms:addon-deployer:${coreTarget.targetName}:v1`]);
  let role;
  try {
    await client.query("BEGIN");
    try {
      const identity = await client.query("SELECT current_database() AS database,inet_server_port() AS port,pg_get_userbyid(d.datdba) AS owner FROM pg_database d WHERE d.datname=current_database()");
      if (identity.rows[0]?.database !== coreTarget.databaseName || Number(identity.rows[0]?.port) !== coreTarget.localPostgres.port || identity.rows[0]?.owner !== coreTarget.roles.owner) fail("target database identity/owner mismatch.");
      role = await ensureRole(client, deployerRole, password);
      const databases = await client.query("SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname");
      for (const row of databases.rows) {
        await client.query(`REVOKE CONNECT ON DATABASE ${quoteIdentifier(row.datname)} FROM PUBLIC`);
        await client.query(`REVOKE ALL ON DATABASE ${quoteIdentifier(row.datname)} FROM ${quoteIdentifier(deployerRole)}`);
      }
      await client.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(coreTarget.databaseName)} TO ${quoteIdentifier(deployerRole)}`);
      const schema = await client.query("SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname='webshop'");
      if (!schema.rowCount) await client.query(`CREATE SCHEMA webshop AUTHORIZATION ${quoteIdentifier(deployerRole)}`);
      else if (schema.rows[0].owner !== deployerRole) fail("existing webshop schema owner mismatch.");
      await client.query("REVOKE ALL ON SCHEMA webshop FROM PUBLIC");
      await client.query(`GRANT USAGE ON SCHEMA webshop TO ${quoteIdentifier(runtimeRole)}`);
      await client.query(`REVOKE ALL ON SCHEMA public FROM ${quoteIdentifier(deployerRole)}`);
      await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(deployerRole)}`);
      await client.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${quoteIdentifier(deployerRole)}`);
      await client.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${quoteIdentifier(deployerRole)}`);
      await requireTables(client, "public", [...manifest.allowedPublicReferenceTables, ...CONTROL_TABLES]);
      for (const table of manifest.allowedPublicReferenceTables) await client.query(`GRANT SELECT,REFERENCES ON TABLE public.${quoteIdentifier(table)} TO ${quoteIdentifier(deployerRole)}`);
      for (const table of CONTROL_TABLES) await client.query(`GRANT SELECT,INSERT,UPDATE ON TABLE public.${quoteIdentifier(table)} TO ${quoteIdentifier(deployerRole)}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(deployerRole)} IN SCHEMA webshop REVOKE ALL ON TABLES FROM PUBLIC`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(deployerRole)} IN SCHEMA webshop REVOKE ALL ON SEQUENCES FROM PUBLIC`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(deployerRole)} IN SCHEMA webshop GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO ${quoteIdentifier(runtimeRole)}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(deployerRole)} IN SCHEMA webshop GRANT USAGE,SELECT ON SEQUENCES TO ${quoteIdentifier(runtimeRole)}`);
      const objects = await client.query("SELECT c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='webshop' AND c.relkind IN ('r','p','S','v','m','f') ORDER BY c.relname");
      for (const object of objects.rows) {
        if (object.owner !== deployerRole || (!manifest.tableNames.includes(object.relname) && !manifest.sequenceNames.includes(object.relname))) fail("webshop object ownership/allowlist drift.");
        if (["r","p","v","m","f"].includes(object.relkind)) await client.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE webshop.${quoteIdentifier(object.relname)} TO ${quoteIdentifier(runtimeRole)}`);
        if (object.relkind === "S") await client.query(`GRANT USAGE,SELECT ON SEQUENCE webshop.${quoteIdentifier(object.relname)} TO ${quoteIdentifier(runtimeRole)}`);
      }
      const databaseAccess = await client.query("SELECT datname,has_database_privilege($1,datname,'CONNECT') AS can_connect,has_database_privilege($1,datname,'TEMP') AS can_temp FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname", [deployerRole]);
      for (const database of databaseAccess.rows) {
        const targetDatabase = database.datname === coreTarget.databaseName;
        if (Boolean(database.can_connect) !== targetDatabase || database.can_temp) fail("deployer cross-database privilege drift.");
      }
      const schemaAccess = await client.query("SELECT has_schema_privilege($1,'public','USAGE') AS public_usage,has_schema_privilege($1,'public','CREATE') AS public_create,has_schema_privilege($1,'webshop','USAGE') AS webshop_usage,has_schema_privilege($1,'webshop','CREATE') AS webshop_create", [deployerRole]);
      const access = schemaAccess.rows[0];
      if (!access?.public_usage || access.public_create || !access.webshop_usage || !access.webshop_create) fail("deployer schema privilege drift.");
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  } finally { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [`nr-cms:addon-deployer:${coreTarget.targetName}:v1`]); }
  return role;
}

async function verifyLogin(coreTarget, role, password) {
  const client = new Client({ connectionString: buildLocalDatabaseUrl(coreTarget, role, password) });
  await client.connect();
  try {
    const result = await client.query("SELECT session_user,current_database(),has_schema_privilege(session_user,'webshop','CREATE') AS schema_create");
    if (result.rows[0]?.session_user !== role || result.rows[0]?.current_database !== coreTarget.databaseName || !result.rows[0]?.schema_create) fail("deployer login/schema-owner smoke failed.");
  } finally { await client.end(); }
}

function sealCredential(targetName, coreTarget, role, password) {
  const record = Buffer.from(canonicalJson({ contractVersion: 1, createdAt: new Date().toISOString(), database: coreTarget.databaseName, password, secretRef: `dpapi-machine://nr-addon-worker/${targetName}/webshop-db-deployer/v1`, targetProfile: targetName, username: role }), "utf8");
  const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  try {
    const result = spawnSync(powershell, ["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",DPAPI_HELPER,"-Mode","seal","-Target",targetName], { cwd: process.cwd(), input: record, encoding: "utf8", shell: false, windowsHide: true });
    if (result.error || result.status !== 0) fail("DPAPI broker credential seal/audit failed.");
    return JSON.parse(result.stdout.trim());
  } finally { record.fill(0); }
}

export async function runAddonDeployerProvision(argv = process.argv.slice(2)) {
  const parsed = readArguments(argv); const targetName = parsed.values.get("--target");
  const coreTarget = resolveCmsCoreTarget(targetName, loadCmsCorePrivilegeManifest());
  const manifest = loadPrivilegeManifest(parsed.values.get("--privilege-manifest-file"), parsed.values.get("--expected-manifest-sha256"), targetName, coreTarget);
  const adminFile = assertProtectedOperatorPasswordFile(parsed.values.get("--admin-password-file"));
  const passwordFile = assertProtectedOperatorPasswordFile(parsed.values.get("--password-file"));
  const plan = { contractVersion: 1, purpose: "addon_deployer_provision", target: targetName, databaseResourceId: coreTarget.databaseResourceId, database: coreTarget.databaseName, deployerRole: manifest.value.deployerRole, runtimeRole: manifest.value.runtimeRole, manifestSha256: manifest.sha256, secretRef: `dpapi-machine://nr-addon-worker/${targetName}/webshop-db-deployer/v1` };
  if (parsed.flags.has("--dry-run")) return { ...plan, status: "preflight", protectedPasswordInputsVerified: true };
  assertWindowsAdministrator();
  const adminPassword = readProtectedOperatorPasswordFile(adminFile).password;
  const password = readProtectedOperatorPasswordFile(passwordFile).password;
  const client = new Client({ connectionString: buildLocalDatabaseUrl(coreTarget, coreTarget.localPostgres.adminUsername, adminPassword) });
  await client.connect();
  try { var roleStateValue = await reconcileDatabase(client, coreTarget, manifest.value, password); } finally { await client.end(); }
  await verifyLogin(coreTarget, manifest.value.deployerRole, password);
  const secret = sealCredential(targetName, coreTarget, manifest.value.deployerRole, password);
  return { ...plan, status: "provisioned", role: roleStateValue, secretCiphertextSha256: secret.ciphertextSha256, secretAclProtected: secret.aclProtected, secretAllowedSids: secret.allowedSids };
}

if (process.argv[1]?.endsWith("db-addon-deployer-provision.mjs")) runAddonDeployerProvision().then((receipt) => console.log(JSON.stringify(receipt))).catch((error) => { console.error(error instanceof Error ? error.message : "[addon-deployer-provision] failed."); process.exitCode = 1; });

export const __addonDeployerProvisionTesting = { CONTROL_TABLES, loadPrivilegeManifest };
