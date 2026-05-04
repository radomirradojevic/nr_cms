import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { contentCategories } from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  await db
    .insert(contentCategories)
    .values([
      { name: "site", contentType: "page" },
      { name: "blog", contentType: "blog_post" },
    ])
    .onConflictDoNothing();

  console.log("Seeded default content categories successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
