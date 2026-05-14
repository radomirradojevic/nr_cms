import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

const url = process.env.DATABASE_URL!;
const isNeon = url.includes(".neon.tech");

// Cast to a single concrete type so TypeScript resolves overloaded methods
// (e.g. .returning(fields)) correctly. Both adapters are API-compatible at
// runtime; the union type would otherwise hide the overloaded signatures.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (isNeon ? drizzleNeon(url) : drizzlePg(url)) as any as ReturnType<
  typeof drizzleNeon
>;

export { db };
