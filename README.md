![NightRaven CMS Logo](public/nr/images/logo/big/NR_Logo.png)

**Live demo:** [https://nr-cms.vercel.app/](https://nr-cms.vercel.app/)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

| Variable                                                              | Description                                                                                                                                      | Required         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| `DATABASE_URL`                                                        | Postgres connection string. A Neon HTTP URL (`postgresql://...neon.tech/...`) takes the optimal serverless path; any Postgres works.             | ✅               |
| `DRIZZLE_AUTO_MIGRATE`                                                | Optional opt-out for build-time migrations. Set to `0`, `false`, or `off` only if a separate deployment step runs `npm run db:migrate`.          | optional         |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                   | Clerk frontend key (use a production instance for prod, a dev instance for previews).                                                            | ✅               |
| `CLERK_SECRET_KEY`                                                    | Clerk backend key.                                                                                                                               | ✅               |
| `CLERK_WEBHOOK_SECRET`                                                | Svix signing secret for `/api/webhooks/clerk`.                                                                                                   | ✅               |
| `STORAGE_PROVIDER`                                                    | `local` (default, writes to disk) or `vercel-blob` (uses Vercel Blob). Auto-detects `vercel-blob` on Vercel when `BLOB_READ_WRITE_TOKEN` is set. | optional         |
| `UPLOADS_DIR`                                                         | Directory the local provider writes to. Defaults to `./storage/uploads`. Ignored when `STORAGE_PROVIDER=vercel-blob`.                            | self-hosted only |
| `BLOB_READ_WRITE_TOKEN`                                               | Vercel Blob read/write token. Auto-injected by Vercel when a Blob store is attached. Required when `STORAGE_PROVIDER=vercel-blob`.               | Vercel only      |
| `VERCEL_FLUID_COMPUTE`                                                | Set to `1` when Fluid Compute is enabled to raise the per-request upload cap from ~4.5 MB to ~200 MB.                                            | optional         |
| `VERCEL_BLOB_MAX_UPLOAD_BYTES`                                        | Explicit override for the Vercel upload cap, in bytes. Takes precedence over `VERCEL_FLUID_COMPUTE`.                                             | optional         |
| `EMAIL_FROM`                                                          | Default `From` address for transactional email.                                                                                                  | ✅ for email     |
| `EMAIL_PROVIDER`                                                      | `resend` (default) or `smtp`.                                                                                                                    | optional         |
| `RESEND_API_KEY`                                                      | Resend API key.                                                                                                                                  | ✅ if Resend     |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | SMTP credentials.                                                                                                                                | ✅ if SMTP       |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                      | Cloudflare Turnstile site key (public). Required for the blog comment form and public forms.                                                     | ✅               |
| `TURNSTILE_SECRET_KEY`                                                | Cloudflare Turnstile secret key. Verifies submissions server-side.                                                                               | ✅               |
| `IP_HASH_SALT`                                                        | ≥32-char random string used to SHA-256-hash visitor IPs for rate limiting. Raw IPs are never stored.                                             | ✅               |

The `storage/` directory is gitignored. Files are streamed through the auth-gated route `app/api/files/[id]/route.ts`. When `STORAGE_PROVIDER=vercel-blob` that route 307-redirects to the public Blob URL instead of streaming bytes through the function.

---

## File storage providers

Uploads (File Manager, Gallery Manager, global-settings logo, form-builder file fields) go through a single abstraction in [lib/file-storage.ts](lib/file-storage.ts). Two providers ship out of the box:

| Provider      | Use case              | Notes                                                                                                                                                   |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`       | Self-hosted (default) | Writes to `UPLOADS_DIR`. Per-file cap up to `proxyClientMaxBodySize` (2 GB) × `MAX_FILE_SIZE` (300 MB).                                                 |
| `vercel-blob` | Vercel deployments    | Stores objects in Vercel Blob, served via 307 redirect from `/api/files/[id]`. Per-request cap is ~4.5 MB unless Fluid Compute / overrides are enabled. |

Selection rules (in order):

1. Explicit `STORAGE_PROVIDER=local` or `STORAGE_PROVIDER=vercel-blob`.
2. Auto-detect: on Vercel (`VERCEL=1`) with a `BLOB_READ_WRITE_TOKEN`, `vercel-blob` is chosen.
3. Otherwise `local`.

The DB schema is provider-agnostic — `files.storage_path` stores the `YYYY/MM/uuid.ext` key, identical across providers, so historical rows keep working if you migrate.

Adding a future provider (S3, Cloudflare R2, Supabase Storage, …) is a matter of implementing the `StorageProvider` interface in [lib/file-storage.ts](lib/file-storage.ts) and registering it in `buildProvider`/`resolveProviderName`. No upload-route changes required.

---

## Deploy on Vercel — Step by Step

> **File storage on Vercel.** Vercel's serverless filesystem is read-only outside the ephemeral `/tmp`, so uploads cannot be persisted to disk. The CMS handles this by switching to the **Vercel Blob** provider — attach a Blob store to your project and the File Manager, Gallery Manager, logo picker, and form-builder file fields all work transparently. Per-request upload size is capped at ~4.5 MB by default; enable Fluid Compute (or set `VERCEL_FLUID_COMPUTE=1` / `VERCEL_BLOB_MAX_UPLOAD_BYTES`) to raise it.

### 1. Provision a Postgres database (Neon recommended)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (`postgresql://...neon.tech/neondb?sslmode=require`).
3. Locally, add it to `.env`:

   ```bash
   DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
   ```

4. (Optional) seed initial data after the first deployment:

   ```bash
   npx tsx db/seed.ts
   ```

The Drizzle client at `db/index.ts` auto-selects the `@neondatabase/serverless` HTTP driver when the host matches `*.neon.tech`, otherwise it falls back to `node-postgres`. Migrations use the standard PostgreSQL protocol through `pg` for both Neon and non-Neon databases so they can run with an advisory lock and transaction support.

### 2. Set up Clerk

1. Create a **Production** Clerk instance at [clerk.com](https://clerk.com).
2. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. In Clerk → **Webhooks**, add an endpoint:
   - URL: `https://<your-domain>/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`.
4. Add your Vercel domain (and any preview domains) under Clerk's **Allowed origins**.

Note: middleware lives in `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`). Role-based admin guards run inside Server Components via `currentUser()`.

### 3. Set up Cloudflare Turnstile

1. Create a Turnstile site at [Cloudflare → Turnstile](https://www.cloudflare.com/products/turnstile/).
2. Add your Vercel production domain (and previews if needed).
3. Copy the **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **Secret key** → `TURNSTILE_SECRET_KEY`.

### 4. Set up email (Resend or SMTP)

For Resend:

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM="CMS <noreply@yourdomain.com>"
```

For SMTP:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SECURE=true
EMAIL_FROM="CMS <noreply@yourdomain.com>"
```

### 5. Generate `IP_HASH_SALT`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Import the project into Vercel

1. Push the repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repository.
3. Framework preset: **Next.js** (auto-detected). Leave Build Command, Output, and Install Command at defaults. Vercel will run `npm run build`, which applies pending migrations before `next build`.
4. Under **Settings → Environment Variables**, paste every variable from the table above for the **Production** environment (and optionally **Preview**). Do **not** set `UPLOADS_DIR` — it has no effect on Vercel.
5. **Attach a Vercel Blob store** under **Settings → Storage → Blob → Create**. Vercel automatically injects `BLOB_READ_WRITE_TOKEN` into every deployment, and the storage layer auto-detects it (no need to set `STORAGE_PROVIDER`). For local development against the same store, run `vercel env pull` to materialise the token into `.env.local`.
6. Click **Deploy**.

### 7. Post-deploy checks

- Visit `https://<domain>/` — the public site renders.
- Sign in at `https://<domain>/dashboard` — Clerk redirects work.
- Trigger a Clerk event (update a user) → confirm `/api/webhooks/clerk` returns 200.
- Submit a test comment on a blog post → confirm Turnstile passes and a row appears in `comments`.
- Submit a form built in `/dashboard/form-builder` → confirm submission row + email notification.
- Upload a small image in `/dashboard/filemanager` → confirm it lands in the attached Vercel Blob store and renders via `/api/files/[id]` (which now 307-redirects to the public Blob URL).

### 8. Production hardening

- Promote `master` → Production branch in Vercel; use Preview deployments for PRs with a separate Clerk **dev** instance and a Neon **branch** database.
- The Hobby plan has a 10-second function timeout. If form submission with attachments or other heavy routes time out, add `export const maxDuration = 60` to that route file or upgrade to Pro.
- Vercel serverless functions cap request bodies at **4.5 MB** by default (configurable on Fluid Compute). The `proxyClientMaxBodySize: "2gb"` setting in `next.config.ts` only applies to self-hosted deploys. On Vercel, set `VERCEL_FLUID_COMPUTE=1` (or `VERCEL_BLOB_MAX_UPLOAD_BYTES=<bytes>`) once Fluid Compute is enabled — the upload routes return a clear error message when the cap is exceeded. For uploads beyond ~100 MB, switch to Vercel Blob's client-side direct upload flow (`@vercel/blob/client` `handleUpload`).
- Preview deployments should use a separate Neon branch or separate Postgres database if they can contain schema changes. The migration runner serializes concurrent builds with a PostgreSQL advisory lock, but it intentionally applies the committed migration chain for whatever database `DATABASE_URL` points at.
- Rotate `IP_HASH_SALT`, `CLERK_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY` periodically.
- Add a custom domain in Vercel → **Domains**, then update Clerk's allowed origins and Turnstile's allowed hostnames.
- The Content-Security-Policy in `next.config.ts` already allows Clerk, Turnstile, YouTube embeds, and the rsms.me font. Add any other third-party origin you embed.

---

## Self-Hosted Deployment

The codebase runs as-is on a single VPS (Node 20+) and supports the full File Manager via the local filesystem:

```bash
npm ci
npm run db:migrate
npm run build
npm start
```

Recommended setup:

- Set `UPLOADS_DIR=/var/lib/nr_cms/uploads` (writable, backed up, **outside** `public/`).
- Run the app behind nginx or Caddy with TLS and a body-size limit ≥ `MAX_FILE_SIZE`.
- Use `pm2` / `systemd` to keep `npm start` alive.
- Point `DATABASE_URL` at any Postgres (managed or self-hosted).
- All other env vars (Clerk, Turnstile, email, `IP_HASH_SALT`) are the same as on Vercel.

The `proxyClientMaxBodySize: "2gb"` setting in `next.config.ts` is active in this mode, so large uploads up to `MAX_FILE_SIZE` (300 MB) work end-to-end.

---

## Database migrations

Use the project scripts rather than `drizzle-kit migrate` directly:

```bash
npm run db:generate        # create a reviewed SQL migration from db/schema.ts
npm run db:migrate:check   # validate journal, SQL files, snapshots, and destructive SQL markers
npm run db:migrate         # apply pending migrations with a Postgres advisory lock
```

`npm run build` runs `npm run db:migrate` first, so a fresh Vercel deployment creates or updates the database schema automatically after `DATABASE_URL` is configured. The runner preserves Drizzle's default `drizzle.__drizzle_migrations` table and adds tag metadata for safer repeat runs.

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Neon Documentation](https://neon.tech/docs)
