import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const result =
    await sql`SELECT id, short_code, original_url FROM links WHERE user_id = 'user_3CXq92cuWjXPb4BJtCiZmc14f31'`;
  console.table(result);
}

main().catch(console.error);
