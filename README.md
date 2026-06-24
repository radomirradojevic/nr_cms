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

Scheduled publish/unpublish needs the scheduler to run. In local development,
set `CRON_SECRET` in `.env`, keep the Next.js dev server running, and start the
local scheduler in a second terminal:

```bash
npm run content:scheduler:dev
```

## Environment Variables

| Variable                                                              | Description                                                                                                                                                                                                   | Required                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `DATABASE_URL`                                                        | Normal Postgres connection string. Neon's pooled TCP string works, as does any regular Postgres database.                                                                                                     | ✅                          |
| `DRIZZLE_AUTO_MIGRATE`                                                | Optional opt-out for build-time migrations. Set to `0`, `false`, or `off` only if a separate deployment step runs `npm run db:migrate`.                                                                       | optional                    |
| `CRON_SECRET`                                                         | Secret for `/api/cron/content-publishing`. Vercel Cron sends it automatically as `Authorization: Bearer ...`; local/self-hosted callers use it too.                                                           | ✅ for scheduled publishing |
| `CONTENT_PUBLISHING_CRON_SECRET`                                      | Optional separate secret accepted by the publishing cron endpoint. Useful when self-hosted callers should not share Vercel's `CRON_SECRET`.                                                                   | optional                    |
| `CONTENT_PUBLISHING_CRON_URL`                                         | Optional full URL used by `npm run content:scheduler:run`, `npm run content:scheduler:dev`, and `npm run content:scheduler:worker`. Defaults to `http://localhost:${PORT:-3000}/api/cron/content-publishing`. | optional                    |
| `CONTENT_PUBLISHING_SCHEDULER_INTERVAL_SECONDS`                       | Interval for the local/self-hosted scheduler worker. Defaults to `60`. Vercel uses `vercel.json` instead.                                                                                                     | optional                    |
| `CONTENT_PUBLISHING_SCHEDULER_ENABLED`                                | Set to `0`, `false`, or `off` to disable the local/self-hosted scheduler worker without removing the script from process management.                                                                          | optional                    |
| `CONTENT_PUBLISHING_SCHEDULER_TIMEOUT_MS`                             | HTTP timeout for one local/self-hosted scheduler tick. Defaults to `30000`.                                                                                                                                   | optional                    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                   | Clerk frontend key (use a production instance for prod, a dev instance for previews).                                                                                                                         | ✅                          |
| `CLERK_SECRET_KEY`                                                    | Clerk backend key.                                                                                                                                                                                            | ✅                          |
| `CLERK_WEBHOOK_SECRET`                                                | Svix signing secret for `/api/webhooks/clerk`.                                                                                                                                                                | ✅                          |
| `STORAGE_PROVIDER`                                                    | `local` (default, writes to disk) or `vercel-blob` (uses Vercel Blob). Auto-detects `vercel-blob` on Vercel when `BLOB_READ_WRITE_TOKEN` is set.                                                              | optional                    |
| `UPLOADS_DIR`                                                         | Directory the local provider writes to. Defaults to `./storage/uploads`. Ignored when `STORAGE_PROVIDER=vercel-blob`.                                                                                         | self-hosted only            |
| `BLOB_READ_WRITE_TOKEN`                                               | Vercel Blob read/write token. Auto-injected by Vercel when a Blob store is attached. Required when `STORAGE_PROVIDER=vercel-blob`.                                                                            | Vercel only                 |
| `VERCEL_FLUID_COMPUTE`                                                | Set to `1` when Fluid Compute is enabled to raise the per-request upload cap from ~4.5 MB to ~200 MB.                                                                                                         | optional                    |
| `VERCEL_BLOB_MAX_UPLOAD_BYTES`                                        | Explicit override for the Vercel upload cap, in bytes. Takes precedence over `VERCEL_FLUID_COMPUTE`.                                                                                                          | optional                    |
| `EMAIL_FROM`                                                          | Default `From` address for transactional email.                                                                                                                                                               | ✅ for email                |
| `EMAIL_PROVIDER`                                                      | `resend` (default) or `smtp`.                                                                                                                                                                                 | optional                    |
| `RESEND_API_KEY`                                                      | Resend API key.                                                                                                                                                                                               | ✅ if Resend                |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | SMTP credentials.                                                                                                                                                                                             | ✅ if SMTP                  |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                      | Cloudflare Turnstile site key (public). Required for the blog comment form and public forms.                                                                                                                  | ✅                          |
| `TURNSTILE_SECRET_KEY`                                                | Cloudflare Turnstile secret key. Verifies submissions server-side.                                                                                                                                            | ✅                          |
| `IP_HASH_SALT`                                                        | ≥32-char random string used to SHA-256-hash visitor IPs for rate limiting. Raw IPs are never stored.                                                                                                          | ✅                          |
| `WEBSHOP_SELF_HOSTED_SITE_ID`                                         | Optional stable install identifier for paid Webshop activation on self-hosted or non-Vercel deployments. Defaults to the configured public URL/env URL when available.                                        | optional                    |

The `storage/` directory is gitignored. Files are streamed through the auth-gated route `app/api/files/[id]/route.ts`. When `STORAGE_PROVIDER=vercel-blob` that route 307-redirects to the public Blob URL instead of streaming bytes through the function.

---

## Scheduled publishing

Scheduled publish/unpublish is not a timer inside the browser or editor. Saving
content only stores workflow state and schedule dates in Postgres. A scheduler
must call `/api/cron/content-publishing` periodically so the app can move due
content into or out of the public site.

The state model is:

- `approved + publish_at` means "publish this later".
- Public pages still return 404 while the row is `approved`, even if
  `publish_at` is already in the past.
- `/api/cron/content-publishing` moves due rows from `approved` to `published`.
- The same endpoint later moves due `published + unpublish_at` rows back to `draft`.

The endpoint is protected. It accepts either:

```http
Authorization: Bearer <CRON_SECRET>
```

or:

```http
x-cron-secret: <CRON_SECRET>
```

The route supports both `GET` and `POST`. Vercel Cron uses `GET`; the local
worker uses `POST`.

Generate a secret once per environment:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Local development

Use this when developing on your machine.

1. Add a secret to `.env`:

   ```bash
   CRON_SECRET=replace-with-generated-secret
   ```

2. Start the Next.js dev server in terminal 1:

   ```bash
   npm run dev
   ```

3. Start the scheduler loop in terminal 2:

   ```bash
   npm run content:scheduler:dev
   ```

   This calls `http://localhost:3000/api/cron/content-publishing` every 60
   seconds by default.

4. If your dev server is not on port 3000, set the URL explicitly:

   ```bash
   CONTENT_PUBLISHING_CRON_URL=http://localhost:3001/api/cron/content-publishing npm run content:scheduler:dev
   ```

5. To test one scheduler tick without starting the loop:

   ```bash
   npm run content:scheduler:run
   ```

   A successful response looks like:

   ```text
   [content-scheduler] 2026-06-06T10:00:00.000Z status=200 published=0 unpublished=0
   ```

6. To run the local loop more often while testing:

   ```bash
   npm run content:scheduler:dev -- --interval-seconds=15
   ```

Common local failures:

- `401` means `CRON_SECRET` in `.env` does not match what the app process sees.
- `fetch failed` usually means `npm run dev` is not running or
  `CONTENT_PUBLISHING_CRON_URL` points at the wrong port.
- `published=0 unpublished=0` is not an error; it means there was no due content
  at that tick.

Available local/self-hosted scheduler commands:

```bash
npm run content:scheduler:run
npm run content:scheduler:dev
npm run content:scheduler:worker
```

`content:scheduler:dev` and `content:scheduler:worker` run the same continuous
worker. The separate names make intent clear: use `dev` locally, use `worker` in
process managers on self-hosted servers.

### Vercel

`vercel.json` registers the cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/content-publishing",
      "schedule": "* * * * *"
    }
  ]
}
```

Vercel setup:

1. Keep the `vercel.json` file in the repository.
2. In Vercel, open **Project -> Settings -> Environment Variables**.
3. Add `CRON_SECRET` for **Production**:

   ```bash
   CRON_SECRET=replace-with-generated-secret
   ```

4. Deploy to Production.
5. After deployment, open **Project -> Settings -> Cron Jobs** and confirm
   `/api/cron/content-publishing` is listed.
6. Open Vercel logs and filter by:

   ```text
   requestPath:/api/cron/content-publishing
   ```

How auth works on Vercel:

- Do not put the secret in `vercel.json`.
- Vercel reads the `CRON_SECRET` environment variable.
- When Vercel invokes the cron route, it sends:

  ```http
  Authorization: Bearer <CRON_SECRET>
  ```

Manual production smoke test:

```bash
curl -fsS -H "Authorization: Bearer replace-with-generated-secret" https://your-domain.com/api/cron/content-publishing
```

Expected JSON:

```json
{ "success": true, "published": 0, "unpublished": 0 }
```

Vercel notes:

- Cron jobs run for Production deployments.
- Cron expressions are evaluated in UTC.
- `* * * * *` means "every minute".
- Vercel plan limits can affect minimum frequency and timing precision. If your
  plan cannot run every minute, use a less frequent `schedule` value or use the
  self-hosted/external scheduler pattern below for minute-level precision.

### Self-hosted

Use this when running the app on your own VPS/server with `npm start`, `pm2`,
`systemd`, Docker, or similar.

Required env values on the server:

```bash
CRON_SECRET=replace-with-generated-secret
CONTENT_PUBLISHING_CRON_URL=https://your-domain.com/api/cron/content-publishing
CONTENT_PUBLISHING_SCHEDULER_INTERVAL_SECONDS=60
```

Option A: run the included worker as a second managed process:

```bash
npm run content:scheduler:worker
```

Example with `pm2`:

```bash
pm2 start npm --name nr-cms-web -- start
pm2 start npm --name nr-cms-scheduler -- run content:scheduler:worker
pm2 save
```

Example `systemd` unit for the scheduler:

```ini
[Unit]
Description=NightRaven CMS content publishing scheduler
After=network.target

[Service]
WorkingDirectory=/var/www/nr_cms
Environment=NODE_ENV=production
Environment=CRON_SECRET=replace-with-generated-secret
Environment=CONTENT_PUBLISHING_CRON_URL=https://your-domain.com/api/cron/content-publishing
Environment=CONTENT_PUBLISHING_SCHEDULER_INTERVAL_SECONDS=60
ExecStart=/usr/bin/npm run content:scheduler:worker
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Option B: use system cron instead of the Node worker:

```bash
* * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/content-publishing
```

Option C: use an external HTTP cron provider. Configure it to call:

```text
https://your-domain.com/api/cron/content-publishing
```

with this header:

```http
Authorization: Bearer <CRON_SECRET>
```

Self-hosted checks:

```bash
npm run content:scheduler:run
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/content-publishing
```

Expected result is HTTP 200 and JSON like:

```json
{ "success": true, "published": 0, "unpublished": 0 }
```

---

## File storage providers

Uploads (File Manager, Gallery Manager, global-settings logo, form-builder file fields) go through a single abstraction in [lib/file-storage.ts](lib/file-storage.ts). Two providers ship out of the box:

| Provider      | Use case              | Notes                                                                                                                                                                                                      |
| ------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`       | Self-hosted (default) | Writes to `UPLOADS_DIR`. Per-file cap up to `proxyClientMaxBodySize` (2 GB) × `MAX_FILE_SIZE` (300 MB).                                                                                                    |
| `vercel-blob` | Vercel deployments    | Stores objects in Vercel Blob, served via 307 redirect from `/api/files/[id]`. File Manager uploads go directly from the browser to Blob so they are not capped by the Vercel function request-body limit. |

Selection rules (in order):

1. Explicit `STORAGE_PROVIDER=local` or `STORAGE_PROVIDER=vercel-blob`.
2. Auto-detect: on Vercel (`VERCEL=1`) with a `BLOB_READ_WRITE_TOKEN`, `vercel-blob` is chosen.
3. Otherwise `local`.

The DB schema is provider-agnostic — `files.storage_path` stores the `YYYY/MM/uuid.ext` key, identical across providers, so historical rows keep working if you migrate.

Adding a future provider (S3, Cloudflare R2, Supabase Storage, …) is a matter of implementing the `StorageProvider` interface in [lib/file-storage.ts](lib/file-storage.ts) and registering it in `buildProvider`/`resolveProviderName`. No upload-route changes required.

---

## Deploy on Vercel — Step by Step

> **File storage on Vercel.** Vercel's serverless filesystem is read-only outside the ephemeral `/tmp`, so uploads cannot be persisted to disk. The CMS handles this by switching to the **Vercel Blob** provider — attach a Blob store to your project and the File Manager, Gallery Manager, logo picker, and form-builder file fields all work transparently. File Manager uploads use Vercel Blob client uploads to avoid the serverless request-body cap; server-routed uploads such as public form file fields still use function requests, where Fluid Compute (or `VERCEL_FLUID_COMPUTE=1` / `VERCEL_BLOB_MAX_UPLOAD_BYTES`) can raise the platform cap.

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

The Drizzle client at `db/index.ts` uses `drizzle-orm/node-postgres` with `pg.Pool` for both Neon and non-Neon Postgres databases. Use a normal PostgreSQL connection string (Neon's pooled TCP string is fine) so application writes and migrations have real transaction support.

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
4. Under **Settings → Environment Variables**, paste every variable from the table above for the **Production** environment (and optionally **Preview**). Set `CRON_SECRET` for scheduled publishing. Do **not** set `UPLOADS_DIR` — it has no effect on Vercel.
5. **Attach a Vercel Blob store** under **Settings → Storage → Blob → Create**. Vercel automatically injects `BLOB_READ_WRITE_TOKEN` into every deployment, and the storage layer auto-detects it (no need to set `STORAGE_PROVIDER`). For local development against the same store, run `vercel env pull` to materialise the token into `.env.local`.
6. Click **Deploy**.
7. Confirm Vercel shows `/api/cron/content-publishing` under **Settings → Cron Jobs** after the production deployment.

### 7. Post-deploy checks

- Visit `https://<domain>/` — the public site renders.
- Sign in at `https://<domain>/dashboard` — Clerk redirects work.
- Trigger a Clerk event (update a user) → confirm `/api/webhooks/clerk` returns 200.
- Submit a test comment on a blog post → confirm Turnstile passes and a row appears in `comments`.
- Submit a form built in `/dashboard/form-builder` → confirm submission row + email notification.
- Upload an image larger than 4.5 MB in `/dashboard/filemanager` → confirm it lands in the attached Vercel Blob store and renders via `/api/files/[id]` (which now 307-redirects to the public Blob URL).
- Schedule an approved content item a few minutes ahead → confirm the Vercel cron log reports it under `/api/cron/content-publishing` and the public slug becomes live after the next cron tick.

### 8. Production hardening

- Promote `master` → Production branch in Vercel; use Preview deployments for PRs with a separate Clerk **dev** instance and a Neon **branch** database.
- The Hobby plan has a 10-second function timeout. If form submission with attachments or other heavy routes time out, add `export const maxDuration = 60` to that route file or upgrade to Pro.
- Vercel serverless functions cap request bodies at **4.5 MB** by default (configurable on Fluid Compute). The File Manager avoids that cap with Vercel Blob client uploads; other multipart routes that still post files through the app function can use `VERCEL_FLUID_COMPUTE=1` (or `VERCEL_BLOB_MAX_UPLOAD_BYTES=<bytes>`) once Fluid Compute is enabled. The `proxyClientMaxBodySize: "2gb"` setting in `next.config.ts` only applies to self-hosted deploys.
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
- Run `npm run content:scheduler:worker` as a second managed process, or call `/api/cron/content-publishing` every minute from system cron with `Authorization: Bearer $CRON_SECRET`.
- Point `DATABASE_URL` at any Postgres (managed or self-hosted).
- All other env vars (Clerk, Turnstile, email, `CRON_SECRET`, `IP_HASH_SALT`) are the same as on Vercel.
- Paid Webshop activation works on self-hosted deployments. Set `WEBSHOP_SELF_HOSTED_SITE_ID` to a stable domain or install ID if the public URL can change, install the private Webshop package, and point `WEBSHOP_ADDON_MODULE` at its entrypoint.
- Do not use `WEBSHOP_ADDON_MODULE=local-private-webshop` for self-hosted production. That alias is only a localhost development shortcut for `npm run dev`.

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
