import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { links } from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

const userId = "user_3CXq92cuWjXPb4BJtCiZmc14f31";

async function seed() {
  await db
    .insert(links)
    .values([
      { shortCode: "vercel", originalUrl: "https://vercel.com", userId },
      { shortCode: "nextjs", originalUrl: "https://nextjs.org", userId },
      { shortCode: "react", originalUrl: "https://react.dev", userId },
      { shortCode: "ts", originalUrl: "https://typescriptlang.org", userId },
      { shortCode: "drizzle", originalUrl: "https://orm.drizzle.team", userId },
      { shortCode: "clerk", originalUrl: "https://clerk.com", userId },
      { shortCode: "shadcn", originalUrl: "https://ui.shadcn.com", userId },
      { shortCode: "radix", originalUrl: "https://radix-ui.com", userId },
      { shortCode: "npm", originalUrl: "https://npmjs.com", userId },
      { shortCode: "node", originalUrl: "https://nodejs.org", userId },
      { shortCode: "deno", originalUrl: "https://deno.com", userId },
      { shortCode: "bun", originalUrl: "https://bun.sh", userId },
      { shortCode: "vite", originalUrl: "https://vitejs.dev", userId },
      { shortCode: "vitest", originalUrl: "https://vitest.dev", userId },
      { shortCode: "jest", originalUrl: "https://jestjs.io", userId },
      { shortCode: "prisma", originalUrl: "https://prisma.io", userId },
      { shortCode: "supabase", originalUrl: "https://supabase.com", userId },
      {
        shortCode: "planetscale",
        originalUrl: "https://planetscale.com",
        userId,
      },
      { shortCode: "turso", originalUrl: "https://turso.tech", userId },
      { shortCode: "railway", originalUrl: "https://railway.app", userId },
      { shortCode: "fly", originalUrl: "https://fly.io", userId },
      { shortCode: "cf", originalUrl: "https://cloudflare.com", userId },
      { shortCode: "aws", originalUrl: "https://aws.amazon.com", userId },
      { shortCode: "gcp", originalUrl: "https://cloud.google.com", userId },
      {
        shortCode: "azure",
        originalUrl: "https://azure.microsoft.com",
        userId,
      },
      { shortCode: "docker", originalUrl: "https://docker.com", userId },
      { shortCode: "k8s", originalUrl: "https://kubernetes.io", userId },
      {
        shortCode: "gh-actions",
        originalUrl: "https://github.com/features/actions",
        userId,
      },
      { shortCode: "stripe", originalUrl: "https://stripe.com", userId },
      { shortCode: "resend", originalUrl: "https://resend.com", userId },
      { shortCode: "postmark", originalUrl: "https://postmarkapp.com", userId },
      { shortCode: "sentry", originalUrl: "https://sentry.io", userId },
      { shortCode: "posthog", originalUrl: "https://posthog.com", userId },
      { shortCode: "linear", originalUrl: "https://linear.app", userId },
      { shortCode: "notion", originalUrl: "https://notion.so", userId },
      { shortCode: "figma", originalUrl: "https://figma.com", userId },
      { shortCode: "loom", originalUrl: "https://loom.com", userId },
      { shortCode: "cal", originalUrl: "https://cal.com", userId },
      { shortCode: "pnpm", originalUrl: "https://pnpm.io", userId },
      { shortCode: "turbo", originalUrl: "https://turbo.build", userId },
      { shortCode: "nx", originalUrl: "https://nx.dev", userId },
      { shortCode: "astro", originalUrl: "https://astro.build", userId },
      { shortCode: "svelte", originalUrl: "https://svelte.dev", userId },
      { shortCode: "solid", originalUrl: "https://solidjs.com", userId },
      { shortCode: "remix", originalUrl: "https://remix.run", userId },
      { shortCode: "trpc", originalUrl: "https://trpc.io", userId },
      { shortCode: "zod", originalUrl: "https://zod.dev", userId },
      { shortCode: "tanstack", originalUrl: "https://tanstack.com", userId },
      {
        shortCode: "storybook",
        originalUrl: "https://storybook.js.org",
        userId,
      },
      { shortCode: "eslint", originalUrl: "https://eslint.org", userId },
    ])
    .onConflictDoNothing();

  console.log("Seeded 50 links successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
