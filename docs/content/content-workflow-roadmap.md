# Content workflow roadmap

Ovaj dokument je operativni redosled za prosirenje content statusa i urednickog toka u CMS-u. Ne implementirati faze paralelno osim ako prethodna faza vec ima zavrsene migracije, server-side validacije, UI izmene i testove.

## Trenutno stanje

Trenutni content model je centralizovan u `content` tabeli u `db/schema.ts`.

- `content.contentType` dozvoljava `page`, `blog_post` i `hero_slider`.
- `content.status` ima DB check samo za `published`, `unpublished`, `archived`.
- Default status je `unpublished`.
- `content.publishedAt` postoji, ali ne postoje `publishAt`, `unpublishAt`, scheduler/job endpointi ili status `scheduled`.
- `content.version` postoji i koristi se za optimistic concurrency u edit lock toku.
- `content.visibility` vec kontrolise public/role-based vidljivost za objavljeni sadrzaj.
- Hero slider je content tip u istoj tabeli, ali se kategorise preko page kategorija.

Glavne tacke koje trenutno koriste status:

- `data/content.ts`: `ContentStatus`, `listContent`, `searchPublishedContent`, `getContentBySlug`, `getHomepageContent`, `updateContentById`.
- `app/dashboard/content/actions.ts`: kreiranje, izmena, status promene, batch status, homepage pravila, revalidacija.
- `app/dashboard/content/content-form.tsx`: status select za admin/publisher; author-only nema izbor statusa.
- `app/dashboard/content/content-table-container.tsx`, `content-table.tsx`, `content-row-actions.tsx`, `batch-actions.tsx`: filteri, badge, akcije.
- `app/api/content/route.ts`: backend list API i `ALLOWED_STATUSES`.
- `app/[slug]/page.tsx`: javni render dozvoljava samo `published`; za `unpublished` ovlascen korisnik dobija `ContentUnpublished`, ali ne vidi pravi frontend render drafta.
- `app/page.tsx`: homepage se renderuje samo ako je `published`.
- `app/blog-category/[id]/page.tsx`, `app/api/search/route.ts`, `app/search/page.tsx`: javni blog/search koriste samo `published`.
- `data/top-menu.ts`: menu itemi i kategorije se prikazuju samo ako vode ka vidljivom `published` sadrzaju.
- `app/dashboard/content/_builder/blocks/hero-slider-static.tsx`: embedded hero slider se renderuje samo ako je `published`.
- `app/dashboard/content/_builder/hero-slider-actions.ts`: picker vidi hero slidere svih statusa u editoru.

Postojece role:

- `viewer`
- `author`
- `publisher`
- `admin`

Postojeca pravila u `app/dashboard/content/actions.ts`:

- backend pristup imaju `admin`, `publisher`, `author`;
- author-only pri kreiranju uvek dobija `unpublished`;
- admin i publisher mogu menjati status ako smeju da edituju target;
- admin jedini postavlja homepage;
- homepage mora biti `published`;
- publisher moze editovati author content, ali ne admin/publisher content;
- server actions vracaju error objekte umesto bacanja gresaka.

## Ciljni status model

Fazno zameniti trenutni model:

```text
unpublished -> draft
published -> published
archived -> archived
```

Ciljni workflow statusi:

```text
draft -> in_review -> approved -> published -> archived
```

Pravila:

- `draft`: radna verzija, nije javna.
- `in_review`: author je poslao sadrzaj na pregled, nije javna.
- `approved`: publisher/admin je odobrio sadrzaj, ali nije javno objavljen.
- `published`: javno dostupno samo ako prolazi visibility i scheduling pravila.
- `archived`: nije javno, ne prikazuje se u pickerima koji traze aktivan sadrzaj.

Ne uvoditi status `scheduled` u fazi 3. Scheduling se modeluje preko vremena:

- `publishAt`
- `unpublishAt`
- `publishedAt`

## Redosled faza

1. `phase-1-editorial-workflow.md`
2. `phase-2-preview.md`
3. `phase-3-scheduled-publishing.md`
4. `phase-4-revisions-version-history.md`

Svaka faza mora imati:

- DB migraciju i update `db/schema.ts` kada se menja schema;
- update TypeScript tipova i Zod schema;
- update server actions i route handler validacija;
- update admin UI filtera, badge labela i akcija;
- update public read helpera;
- testove za server-side pravila;
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run db:migrate:check`.

## Next.js 16 pravila za sve faze

Postovati projektna pravila:

- Ne kreirati `middleware.ts`; routing/proxy logika ide u `proxy.ts`.
- `params` i `searchParams` u pages/layouts/route handlerima tretirati kao Promise gde je to Next 16 obrazac u repo-u.
- Koristiti `@/*` path alias.
- Server Actions imaju `'use server'`, proveravaju auth, validiraju input i vracaju error objekte.
- Default su Server Components; `'use client'` dodati samo kada postoje hooks/interakcija.
- Tailwind v4 konfiguracija je u `globals.css`, ne uvoditi `tailwind.config.js`.
- ESLint je flat config (`eslint.config.mjs`).

## Globalni acceptance kriterijumi

Faza je gotova tek kada:

- stari i novi statusi imaju jasan migration/backfill put;
- public site nikad ne prikaze draft/review/approved/archived sadrzaj bez explicit preview ovlascenja;
- author ne moze samostalno objaviti;
- publisher/admin status tranzicije prolaze server-side proveru;
- homepage ne moze biti neobjavljena, neodobrena, zakazana u buducnost ili istekla;
- hero slider embed ne prikazuje slider koji nije aktivno public-published;
- menu/search/blog category ne leak-uju nepublicirani sadrzaj;
- testovi pokrivaju barem jedan pozitivan i jedan negativan slucaj za svaku novu server-side odluku.
