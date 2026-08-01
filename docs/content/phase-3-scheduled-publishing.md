# Phase 3 - Scheduled publishing

Cilj faze 3 je zakazano objavljivanje i skidanje sadrzaja sa objave bez uvodjenja statusa `scheduled`. Ova faza zavisi od faze 1 i najbolje dolazi posle faze 2, jer editori treba da mogu da pregledaju approved/scheduled sadrzaj pre public objave.

## Status i scheduling model

Ne dodavati status `scheduled`.

Koristiti status + vreme:

```text
status = approved, publishAt in future -> approved and scheduled for publish
status = published, publishAt null/past, unpublishAt null/future -> live
status = published, unpublishAt past -> expired/not live or auto-unpublished by job
```

Preporuceni canonical public uslov:

```text
status = 'published'
AND (publishAt IS NULL OR publishAt <= now())
AND (unpublishAt IS NULL OR unpublishAt > now())
```

Za `approved` + `publishAt` u buducnosti scheduler kasnije prebacuje status u `published`.

## DB i migracije

Dodati kolone u `content`:

- `publishAt`: timestamp with timezone nullable
- `unpublishAt`: timestamp with timezone nullable

Postojeci `publishedAt` ostaje istorijski timestamp kada je content prvi put ili poslednji put objavljen. Pre implementacije odluciti i dokumentovati:

- opcija A: `publishedAt` je first published time;
- opcija B: `publishedAt` je last published time.

Preporuka: zadrzati postojece ponasanje kao first published time, jer trenutni kod popunjava samo ako je null.

Dodati check constraint:

```sql
unpublish_at IS NULL OR publish_at IS NULL OR unpublish_at > publish_at
```

Dodati indekse:

- status + publishAt za due publish query;
- status + unpublishAt za due unpublish query.

Primer indeksa:

```text
content_status_publish_at_idx
content_status_unpublish_at_idx
```

## Tipovi i input validacija

Prosiriti:

- `data/content.ts` select/list tipove;
- `app/api/content/route.ts` JSON response;
- `ContentTable` row shape;
- `ContentForm` initial props;
- `CreateContentInput` i `UpdateContentInput` Zod schema;
- eventualni centralni `ContentStatus` helper ako je uveden u fazi 1.

Validacija:

- `publishAt` i `unpublishAt` su ISO datetime stringovi iz UI-a ili Date objekti na serveru;
- `unpublishAt > publishAt` ako oba postoje;
- author-only ne moze zakazati objavu;
- publisher/admin mogu zakazati `approved` ili `published` content;
- `publishAt` u proslosti se tretira kao immediate publish ako status prelazi u `published`;
- `unpublishAt` u proslosti nije dozvoljen pri save-u osim ako je cilj immediate unpublish kroz posebnu akciju.

## Server-side pravila

U `app/dashboard/content/actions.ts`:

1. `createContent`:

- author-only: ignorise scheduling input;
- publisher/admin:
  - `approved + publishAt future` je validno;
  - `published + publishAt future` nije preporuceno; ili automatski pretvoriti u `approved`, ili vratiti error. Preporuka: vratiti error i traziti `approved`;
  - `published + publishAt null/past` objavljuje odmah;
  - `unpublishAt` moze biti setovan samo ako je content planiran da bude ili postane published.

2. `updateContent`:

- status i scheduling polja validirati zajedno;
- ako se status vraca u `draft` ili `in_review`, ocistiti `publishAt` osim ako se proizvodno odluci da se schedule cuva kao draft metadata;
- ako content postane `published` immediate, postaviti `publishedAt` ako je null;
- ako content vise nije public-live, revalidirati public paths.

3. `setStatus`:

- status change ne sme pregaziti schedule bez jasne semantike;
- "Publish now" treba da ocisti `publishAt` ili ga postavi na `now`;
- "Unpublish now" treba da status prebaci u `draft` ili `approved` prema dogovoru. Preporuka: `draft` za unpublish iz public-a.

## Public read helper

Uvesti jedan centralni helper da se ne duplira scheduling uslov:

```ts
export function isContentLive(row: Pick<ContentRow, "status" | "publishAt" | "unpublishAt">, now = new Date()) {
  return (
    row.status === "published" &&
    (!row.publishAt || row.publishAt <= now) &&
    (!row.unpublishAt || row.unpublishAt > now)
  );
}
```

Za SQL query-je dodati helper, npr.:

```ts
export function buildLiveContentWhere(now = new Date()): SQL {
  return and(
    eq(content.status, "published"),
    or(isNull(content.publishAt), lte(content.publishAt, now)),
    or(isNull(content.unpublishAt), gt(content.unpublishAt, now)),
  );
}
```

Koristiti ga u:

- `searchPublishedContent`;
- `listContent` kada se koristi za public blog category;
- `data/top-menu.ts`;
- `app/page.tsx`;
- `app/[slug]/page.tsx`;
- `app/dashboard/content/_builder/blocks/hero-slider-static.tsx`;
- `data/form-submissions.ts` ako public access zavisi od parent published contenta.

Ne oslanjati se samo na background job. Public read mora samostalno sakriti future/expired content.

## Scheduler/job

Dodati route handler, npr:

```text
app/api/cron/content-publishing/route.ts
```

Pravila:

- koristiti `auth()` nije dovoljno za cron; koristiti tajni header/env var ili platform cron secret;
- route sme da radi samo server-side;
- batch:
  - `approved` sa `publishAt <= now()` -> `published`, set `publishedAt` ako null;
  - `published` sa `unpublishAt <= now()` -> `draft` ili `approved` po odluci. Preporuka: `draft` ako je skinuto sa public-a;
- logovati broj promenjenih redova;
- revalidirati relevantne slugove, homepage i top-menu tag.

Ako se koristi Vercel Cron, dodati config samo kada projekat vec ima pattern za to. Ako nema, dokumentovati env i endpoint.

## Admin UI

U `ContentForm` dodati publishing schedule sekciju za publisher/admin:

- date-time input za `publishAt`;
- date-time input za `unpublishAt`;
- akcije:
  - "Publish now"
  - "Schedule publish"
  - "Clear schedule"

Za author-only:

- prikazati read-only informaciju ako content ima schedule, ali ne dozvoliti izmenu.

U `ContentTable`:

- dodati kolone ili sekundarni tekst:
  - `Publish at`
  - `Unpublish at`
  - "Scheduled" badge kao derived label, ne status.

Derived labels:

- `approved + publishAt future`: "Scheduled"
- `published + unpublishAt future`: "Live until ..."
- `published + unpublishAt past`: "Expired" ako job jos nije prosao

Filteri:

- status filter ostaje status filter;
- opciono dodati derived filter `scheduled`, `live`, `expired`.

## Homepage pravila

Homepage moze biti samo content koji je trenutno live:

```text
status = published
publishAt null/past
unpublishAt null/future
```

Ako admin zakaze homepage u buducnost, ne treba je odmah postaviti kao active homepage osim ako se doda posebno `homepagePublishAt` pravilo. Preporuka za fazu 3:

- ne dozvoliti homepage za future scheduled page;
- ako homepage dobije `unpublishAt`, upozoriti da ce posle isteka sajt prikazati "No homepage configured" dok se ne postavi druga homepage.

## Hero slider activation window

Hero slider posebno dobija smisao za aktivaciju od-do.

Koristiti iste `publishAt/unpublishAt` kolone za pocetak/kraj aktivnog perioda.

Public embed `HeroSliderStatic` treba da renderuje samo live slider.

Picker u editoru:

- prikazuje status i schedule info;
- moze prikazati non-live slider, ali sa jasnim badge-om;
- preview nije isto sto i live render.

## Testovi

Minimalni testovi:

- future `publishAt` content se ne prikazuje na public slug/search/menu/blog category;
- due `approved + publishAt <= now` cron prebacuje u `published`;
- due unpublish prebacuje `published` u odabrani target status;
- public helper sakriva expired content cak i ako cron nije prosao;
- homepage ne moze biti future scheduled;
- hero slider embed ne renderuje future/expired slider;
- author ne moze setovati schedule;
- publisher/admin mogu setovati validan schedule;
- `unpublishAt <= publishAt` se odbija.

## Acceptance kriterijumi

- Nema statusa `scheduled`.
- Public read koristi centralni live uslov.
- Cron/job samo sinhronizuje stanje, ali public sigurnost ne zavisi od cron-a.
- UI jasno razlikuje workflow status od derived schedule labela.
- Hero slider ima aktivan od-do model kroz iste kolone.
