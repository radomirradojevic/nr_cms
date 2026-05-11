import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

const url = process.env.DATABASE_URL!;
const isNeon = url.includes(".neon.tech");

const db = isNeon ? drizzleNeon(url) : drizzlePg(url);

export { db };
