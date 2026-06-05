import "dotenv/config";
import { db, pool } from "./index";
import { contentCategories } from "./schema";

async function seed() {
  await db
    .insert(contentCategories)
    .values([
      { name: "site", contentType: "page" },
      { name: "blog", contentType: "blog_post" },
    ])
    .onConflictDoNothing();

  console.log("Seeded default content categories successfully.");
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });
