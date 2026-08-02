import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

import {
  assertProtectedPasswordFile,
  buildLocalDatabaseUrl,
  quoteIdentifier,
  redactedDatabaseTarget,
} from "./core-db-contract.mjs";

const { Client } = pg;
const WINDOWS_DPAPI_SCRIPT = path.resolve(
  process.cwd(),
  "scripts",
  "windows-core-dpapi.ps1",
);
const OPERATOR_ROOT = "D:\\nr_runtime\\operator-secrets";
const CORE_SCHEMAS = ["public", "drizzle", "nr_control"];
const ROLE_ATTRIBUTES = [
  "rolcanlogin",
  "rolsuper",
  "rolcreaterole",
  "rolcreatedb",
  "rolreplication",
  "rolbypassrls",
  "rolinherit",
];

function fail(message) {
  throw new Error(`[cms-core-db] ${message}`);
}

function powershellExecutable() {
  return process.env.SystemRoot
    ? path.join(
        process.env.SystemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      )
    : "powershell.exe";
}

function runPowerShell(argumentsList, operation) {
  if (process.platform !== "win32") {
    fail(`${operation} requires Windows DPAPI LocalMachine.`);
  }
  const result = spawnSync(
    powershellExecutable(),
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      WINDOWS_DPAPI_SCRIPT,
      ...argumentsList,
    ],
    { encoding: null, shell: false, windowsHide: true },
  );
  if (result.error || result.status !== 0) {
    // Password content is deliberately never included in the failure channel.
    fail(`${operation} failed its protected-file or DPAPI policy check.`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

export function assertWindowsAdministrator() {
  if (process.platform !== "win32") {
    fail(
      "core provisioning is implemented only for Windows LocalMachine DPAPI.",
    );
  }
  const result = spawnSync(
    powershellExecutable(),
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$p=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); if(-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){exit 1}",
    ],
    { encoding: "utf8", shell: false, windowsHide: true },
  );
  if (result.error || result.status !== 0) {
    fail(
      "core provisioning/migration must be run from an elevated Administrator shell.",
    );
  }
}

export function assertProtectedOperatorPasswordFile(filePath) {
  const protectedPath = assertProtectedPasswordFile(filePath);
  runPowerShell(
    ["-Mode", "assert-input", "-Path", protectedPath],
    "password file",
  );
  return protectedPath;
}

export function readProtectedOperatorPasswordFile(filePath) {
  const protectedPath = assertProtectedOperatorPasswordFile(filePath);
  const password = fs.readFileSync(protectedPath, "utf8").replace(/\r?\n$/, "");
  if (!password || /[\r\n\0]/.test(password)) {
    fail("password file must contain exactly one non-empty line.");
  }
  return { password, protectedPath };
}

export function assertStaticMigratorSecretPath(target) {
  const expected = path.resolve(
    OPERATOR_ROOT,
    `${target.targetName}-cms-core-migrator.v1.dpapi`,
  );
  if (path.resolve(target.migratorSecretPath) !== expected) {
    fail(
      "CmsCorePrivilegeManifestV1 migrator secret path is not the static operator root.",
    );
  }
  return expected;
}

export function sealMigratorPasswordRef(target, protectedPasswordFile) {
  const outputPath = assertStaticMigratorSecretPath(target);
  runPowerShell(
    [
      "-Mode",
      "seal",
      "-Path",
      protectedPasswordFile,
      "-OutputPath",
      outputPath,
    ],
    "migrator secret sealing",
  );
  runPowerShell(
    ["-Mode", "assert-output", "-Path", outputPath],
    "migrator secret ACL",
  );
  return outputPath;
}

export function unsealMigratorPasswordRef(target) {
  const secretPath = assertStaticMigratorSecretPath(target);
  if (!fs.existsSync(secretPath)) {
    fail("the static migrator DPAPI secret ref does not exist.");
  }
  const plain = runPowerShell(
    ["-Mode", "unseal", "-Path", secretPath],
    "migrator secret resolution",
  );
  const password = plain.toString("utf8");
  plain.fill(0);
  if (!password || /[\r\n\0]/.test(password)) {
    fail("the static migrator DPAPI secret ref is invalid.");
  }
  return password;
}

export function redactedProvisionReceipt(target, operation, extra = {}) {
  return {
    contractVersion: target.contractVersion,
    databaseResourceId: target.databaseResourceId,
    manifestHash: target.manifestHash,
    migratorSecretRef: target.migratorSecretRef,
    operation,
    target: target.targetName,
    ...extra,
  };
}

function expectedRoleAttributes(login) {
  return {
    rolbypassrls: false,
    rolcanlogin: login,
    rolcreatedb: false,
    rolcreaterole: false,
    rolinherit: false,
    rolreplication: false,
    rolsuper: false,
  };
}

async function getRole(client, role) {
  const result = await client.query(
    `SELECT ${ROLE_ATTRIBUTES.join(", ")} FROM pg_roles WHERE rolname = $1`,
    [role],
  );
  return result.rows[0] ?? null;
}

async function ensureRole(client, role, login, password) {
  const existing = await getRole(client, role);
  const expected = expectedRoleAttributes(login);
  if (!existing) {
    await client.query(
      `CREATE ROLE ${quoteIdentifier(role)} ${login ? "LOGIN" : "NOLOGIN"} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
    );
    if (login)
      await setRolePasswordWithoutStatementSecret(client, role, password);
    return "created";
  }
  for (const [attribute, expectedValue] of Object.entries(expected)) {
    if (Boolean(existing[attribute]) !== expectedValue) {
      fail(
        `existing role ${role} has unexpected ${attribute}; refusing implicit correction.`,
      );
    }
  }
  return "adopted";
}

async function setRolePasswordWithoutStatementSecret(client, role, password) {
  if (typeof password !== "string" || !password || /[\0]/.test(password)) {
    fail("protected password input is invalid.");
  }
  const setting = `nr_cms_core.password_${role}`;
  try {
    // PostgreSQL utility commands do not accept a bind parameter for PASSWORD.
    // Keep the value in a transaction-local setting supplied as a bind value so
    // neither the SQL statement nor the audit receipt carries plaintext.
    await client.query("SELECT set_config($1, $2, false)", [setting, password]);
    await client.query(`
      DO $$
      BEGIN
        EXECUTE 'ALTER ROLE ${quoteIdentifier(role)} PASSWORD ' || quote_literal(current_setting('${setting}'));
      END
      $$;
    `);
  } finally {
    await client.query("SELECT set_config($1, '', false)", [setting]);
  }
}

async function assertExactMemberships(client, target) {
  const roles = Object.values(target.roles);
  const result = await client.query(
    `
      SELECT member_role.rolname AS member, granted_role.rolname AS granted
      FROM pg_auth_members membership
      JOIN pg_roles member_role ON member_role.oid = membership.member
      JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
      WHERE member_role.rolname = ANY($1::text[])
    `,
    [roles],
  );
  const memberships = new Map(roles.map((role) => [role, new Set()]));
  for (const row of result.rows) memberships.get(row.member)?.add(row.granted);
  const expected = new Map([
    [target.roles.owner, new Set()],
    [target.roles.migrator, new Set([target.roles.owner])],
    [target.roles.runtime, new Set()],
  ]);
  for (const [role, expectedMemberships] of expected) {
    const actual = memberships.get(role) ?? new Set();
    if (
      actual.size !== expectedMemberships.size ||
      [...actual].some((value) => !expectedMemberships.has(value))
    ) {
      fail(
        `existing role ${role} has membership outside the exact core contract.`,
      );
    }
  }
}

async function assertExpectedDatabase(client, target) {
  const result = await client.query(
    `SELECT datname, pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = $1`,
    [target.databaseName],
  );
  if (!result.rows[0]) {
    fail(
      `target database ${target.databaseName} must be created by the operator before provisioning.`,
    );
  }
}

async function assertNoUnknownSchemas(client) {
  const result = await client.query(`
    SELECT nspname
    FROM pg_namespace
    WHERE nspname !~ '^pg_'
      AND nspname NOT IN ('information_schema', 'public', 'drizzle', 'nr_control')
    ORDER BY nspname
  `);
  if (result.rowCount) {
    fail(
      "target database has a non-contract schema; explicit migration/restore review is required.",
    );
  }
}

async function assignCoreOwnership(client, target) {
  const owner = target.roles.owner;
  await client.query(
    `ALTER DATABASE ${quoteIdentifier(target.databaseName)} OWNER TO ${quoteIdentifier(owner)}`,
  );
  await client.query(`ALTER SCHEMA public OWNER TO ${quoteIdentifier(owner)}`);
  await client.query(
    `CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION ${quoteIdentifier(owner)}`,
  );
  await client.query(`ALTER SCHEMA drizzle OWNER TO ${quoteIdentifier(owner)}`);
  await client.query(
    `CREATE SCHEMA IF NOT EXISTS nr_control AUTHORIZATION ${quoteIdentifier(owner)}`,
  );
  await client.query(
    `ALTER SCHEMA nr_control OWNER TO ${quoteIdentifier(owner)}`,
  );

  const objects = await client.query(
    `
      SELECT n.nspname AS schema_name, c.relname, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ANY($1::text[])
        AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
      ORDER BY n.nspname, c.relname
    `,
    [CORE_SCHEMAS],
  );
  for (const object of objects.rows) {
    const relationType = {
      r: "TABLE",
      p: "TABLE",
      S: "SEQUENCE",
      v: "VIEW",
      m: "MATERIALIZED VIEW",
      f: "FOREIGN TABLE",
    }[object.relkind];
    await client.query(
      `ALTER ${relationType} ${quoteIdentifier(object.schema_name)}.${quoteIdentifier(object.relname)} OWNER TO ${quoteIdentifier(owner)}`,
    );
  }
}

export async function reconcileRuntimePrivileges(client, target) {
  const { owner, runtime } = target.roles;
  const quotedRuntime = quoteIdentifier(runtime);
  const quotedOwner = quoteIdentifier(owner);
  const ledgerSchema = quoteIdentifier(target.migrationLedger.schema);
  const ledgerTable = quoteIdentifier(target.migrationLedger.table);

  await client.query(
    `REVOKE ALL ON DATABASE ${quoteIdentifier(target.databaseName)} FROM PUBLIC`,
  );
  await client.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(target.databaseName)} TO ${quotedRuntime}, ${quoteIdentifier(target.roles.migrator)}`,
  );
  for (const schema of CORE_SCHEMAS) {
    await client.query(
      `REVOKE ALL ON SCHEMA ${quoteIdentifier(schema)} FROM PUBLIC`,
    );
  }
  await client.query(`REVOKE ALL ON SCHEMA nr_control FROM ${quotedRuntime}`);
  await client.query(
    `REVOKE ALL ON ALL TABLES IN SCHEMA nr_control FROM ${quotedRuntime}`,
  );
  await client.query(
    `REVOKE ALL ON ALL SEQUENCES IN SCHEMA nr_control FROM ${quotedRuntime}`,
  );
  await client.query(`REVOKE ALL ON SCHEMA drizzle FROM ${quotedRuntime}`);
  await client.query(
    `REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM ${quotedRuntime}`,
  );
  await client.query(
    `REVOKE ALL ON ALL SEQUENCES IN SCHEMA drizzle FROM ${quotedRuntime}`,
  );

  await client.query(`REVOKE ALL ON SCHEMA public FROM ${quotedRuntime}`);
  await client.query(
    `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${quotedRuntime}`,
  );
  await client.query(
    `REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ${quotedRuntime}`,
  );
  await client.query(`GRANT USAGE ON SCHEMA public TO ${quotedRuntime}`);
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quotedRuntime}`,
  );
  await client.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quotedRuntime}`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwner} IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwner} IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwner} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRuntime}`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwner} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${quotedRuntime}`,
  );

  const ledger = await client.query("SELECT to_regclass($1) AS name", [
    `${target.migrationLedger.schema}.${target.migrationLedger.table}`,
  ]);
  if (ledger.rows[0]?.name) {
    await client.query(
      `GRANT USAGE ON SCHEMA ${ledgerSchema} TO ${quotedRuntime}`,
    );
    await client.query(
      `GRANT SELECT ON TABLE ${ledgerSchema}.${ledgerTable} TO ${quotedRuntime}`,
    );
  }
}

async function verifyLogin(target, role, password) {
  const client = new Client({
    connectionString: buildLocalDatabaseUrl(target, role, password),
  });
  await client.connect();
  try {
    const current = await client.query("SELECT session_user");
    if (current.rows[0]?.session_user !== role) {
      fail("login verification did not bind the expected target role.");
    }
  } finally {
    await client.end();
  }
}

export async function provisionCmsCoreDatabase({
  target,
  adminPassword,
  migratorPassword,
  runtimePassword,
  migratorPasswordFile,
}) {
  const adminUrl = buildLocalDatabaseUrl(
    target,
    target.localPostgres.adminUsername,
    adminPassword,
    target.localPostgres.adminDatabase,
  );
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await assertExpectedDatabase(admin, target);
  } finally {
    await admin.end();
  }

  const targetAdmin = new Client({
    connectionString: buildLocalDatabaseUrl(
      target,
      target.localPostgres.adminUsername,
      adminPassword,
    ),
  });
  await targetAdmin.connect();
  try {
    await assertNoUnknownSchemas(targetAdmin);
    const ownerState = await ensureRole(targetAdmin, target.roles.owner, false);
    const migratorState = await ensureRole(
      targetAdmin,
      target.roles.migrator,
      true,
      migratorPassword,
    );
    const runtimeState = await ensureRole(
      targetAdmin,
      target.roles.runtime,
      true,
      runtimePassword,
    );
    await targetAdmin.query(
      `GRANT ${quoteIdentifier(target.roles.owner)} TO ${quoteIdentifier(target.roles.migrator)}`,
    );
    await assertExactMemberships(targetAdmin, target);
    await assignCoreOwnership(targetAdmin, target);
    await reconcileRuntimePrivileges(targetAdmin, target);
    await verifyLogin(target, target.roles.migrator, migratorPassword);
    await verifyLogin(target, target.roles.runtime, runtimePassword);
    sealMigratorPasswordRef(target, migratorPasswordFile);
    return redactedProvisionReceipt(target, "provisioned", {
      database: redactedDatabaseTarget(target, target.roles.runtime),
      roles: {
        owner: ownerState,
        migrator: migratorState,
        runtime: runtimeState,
      },
      migratorSecretSealed: true,
    });
  } finally {
    await targetAdmin.end();
  }
}

export const __coreDbProvisioningTesting = {
  CORE_SCHEMAS,
  OPERATOR_ROOT,
  expectedRoleAttributes,
};
