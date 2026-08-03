import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const isPublicBuildPhase = process.env.NR_CMS_ENV_PHASE === "build";

if (!databaseUrl && !isPublicBuildPhase) {
  throw new Error("DATABASE_URL is required.");
}

type GlobalWithPgPool = typeof globalThis & {
  __nrCmsPgPool?: Pool;
};

function envBoolean(name: string): boolean | undefined {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return undefined;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  throw new Error(`${name} must be a boolean value.`);
}

function envInteger(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return parsed;
}

function parseDatabaseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function withoutSslMode(value: string): string {
  const url = parseDatabaseUrl(value);
  if (!url) return value;
  url.searchParams.delete("sslmode");
  return url.toString();
}

function resolveSslConfig(value: string): PoolConfig["ssl"] {
  const forcedSsl = envBoolean("DATABASE_SSL");
  const rejectUnauthorized =
    envBoolean("DATABASE_SSL_REJECT_UNAUTHORIZED") ?? true;
  const url = parseDatabaseUrl(value);
  const sslMode = url?.searchParams.get("sslmode")?.toLowerCase();
  const isNeon = url?.hostname.endsWith(".neon.tech") ?? false;

  if (forcedSsl === false || sslMode === "disable") return false;

  if (forcedSsl === true || isNeon || sslMode) {
    return {
      rejectUnauthorized:
        sslMode === "no-verify" ? false : rejectUnauthorized,
    };
  }

  return false;
}

const poolConfig: PoolConfig = {
  connectionString: withoutSslMode(databaseUrl ?? "postgresql://build-phase-forbidden@127.0.0.1:1/nr_build"),
  connectionTimeoutMillis: envInteger("DATABASE_CONNECTION_TIMEOUT_MS", 10_000),
  idleTimeoutMillis: envInteger("DATABASE_IDLE_TIMEOUT_MS", 30_000),
  max: envInteger("DATABASE_POOL_MAX", 10),
  ssl: resolveSslConfig(databaseUrl ?? "postgresql://build-phase-forbidden@127.0.0.1:1/nr_build"),
};

const globalForPg = globalThis as GlobalWithPgPool;
const pool =
  globalForPg.__nrCmsPgPool ??
  (isPublicBuildPhase
    ? createBuildForbiddenPool()
    : new Pool(poolConfig));

globalForPg.__nrCmsPgPool = pool;

const db = drizzle(pool);

export { db, pool };

function createBuildForbiddenPool(): Pool {
  // drizzle reads harmless Pool metadata during module initialization. A real
  // pool object keeps that import safe, while query/connect are replaced
  // before any socket can be opened in the public-only build process.
  const buildPool = new Pool(poolConfig);
  const forbidden = async (): Promise<never> => {
    throw new Error("Database access is forbidden during NR_CMS_ENV_PHASE=build.");
  };
  buildPool.query = forbidden as Pool["query"];
  buildPool.connect = forbidden as Pool["connect"];
  return buildPool;
}
