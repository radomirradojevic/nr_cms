# Phase 1 - Editorial workflow

Cilj faze 1 je da se trenutni trostatusni model prosiri u urednicki workflow bez uvodjenja preview tokena, scheduler-a ili revision snapshotova.

## Ulazno stanje

Trenutno postoje statusi:

```text
published
unpublished
archived
```

Trenutni semanticki mapping:

```text
unpublished -> draft
published -> published
archived -> archived
```

Ciljni statusi za fazu 1:

```text
draft
in_review
approved
published
archived
```

Ne uvoditi `scheduled` status u ovoj fazi.

## DB i migracije

1. U `db/schema.ts` promeniti `content.status` default sa `unpublished` na `draft`.
2. Prosiriti `content_status_check` na:

```sql
status IN ('draft','in_review','approved','published','archived')
```

3. Napraviti Drizzle migraciju koja:

- drop-uje stari `content_status_check`;
- mapira postojece `unpublished` u `draft`;
- zadrzava `published` i `archived`;
- postavlja novi default `draft`;
- dodaje novi check constraint.

4. Ne menjati `published_at` semantiku: popunjava se pri prvom prelasku u `published`.
5. Ne menjati `content.version` logiku u ovoj fazi.

## Tipovi i konstante

1. U `data/content.ts` promeniti `ContentStatus` na:

```ts
export type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";
```

2. Uvesti centralne konstante, po mogucnosti u `data/content.ts` ili novi `lib/content-status.ts`:

```ts
export const CONTENT_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;
```

3. Zameniti lokalne liste statusa u:

- `app/api/content/route.ts`
- `app/dashboard/content/actions.ts`
- `app/dashboard/content/content-form.tsx`
- `app/dashboard/content/content-table-container.tsx`
- `app/dashboard/content/content-table.tsx`
- `app/dashboard/content/batch-actions.tsx`
- `app/dashboard/content/content-row-actions.tsx`
- `app/dashboard/content/[id]/edit/page.tsx`

4. Izbegavati dupliranje string literal union tipova u UI komponentama.

## Server-side workflow pravila

Implementirati tranzicije kao server-side pravila, ne samo kao UI gating.

Preporuceni model tranzicija:

```text
draft -> in_review
draft -> approved        admin/publisher only
draft -> published       admin/publisher only
in_review -> draft       author owner, publisher/admin
in_review -> approved    publisher/admin
in_review -> published   publisher/admin
approved -> draft        publisher/admin
approved -> published    publisher/admin
published -> draft       publisher/admin; public unpublish
published -> archived    publisher/admin
archived -> draft        publisher/admin
archived -> published    publisher/admin only after explicit decision
```

Author-only pravila:

- moze kreirati samo `draft`;
- moze menjati sopstveni `draft`;
- moze poslati sopstveni `draft` u `in_review`;
- moze vratiti sopstveni `in_review` u `draft` ako zeli doradu;
- ne moze postaviti `approved`, `published` ili `archived`;
- ne moze menjati status tudjeg sadrzaja.

Publisher pravila:

- moze editovati author content prema postojecem `canEdit` pravilu;
- moze promeniti status author contenta kroz review/publish tok;
- ne moze preuzeti admin/publisher content osim ako postojece `canEdit` pravilo to dozvoljava.

Admin pravila:

- moze sve status tranzicije;
- jedini moze postaviti homepage.

## Server actions

U `app/dashboard/content/actions.ts`:

1. Zameniti create/update/status Zod enum-e novim statusima.
2. `createContent`:

- author-only ignorise status input i uvek kreira `draft`;
- publisher/admin mogu kreirati `draft`, `approved` ili `published`;
- preporuka: ne dozvoliti direktno kreiranje `archived`;
- ako se kreira `published`, `publishedAt = new Date()`;
- homepage i dalje moze samo za `page` i samo kada je status `published`.

3. `updateContent`:

- razdvojiti content edit od status tranzicije;
- ako `data.status` menja status, pozvati helper tipa `canTransitionStatus(actor, target, nextStatus)`;
- ako prelazi u `published` i `publishedAt` je null, postaviti `publishedAt`;
- ako prelazi iz `published` u bilo sta drugo i target je homepage, skinuti `homepage`;
- ne resetovati `publishedAt` pri unpublish-u; to ostaje istorijski podatak prve/poslednje objave prema odabranoj semantici. Ako se zeli "last published at", dokumentovati i testirati.

4. `setStatus`:

- zameniti `canPublish` imenom koje odgovara sireg workflow-u, npr. `canTransitionContentStatus`;
- validirati dozvoljenu tranziciju;
- postaviti `publishedAt` samo pri prelasku u `published`;
- revalidirati javne putanje kada je stari ili novi status `published`.

5. `batchSetStatus`:

- podrzati nove statuse samo ako server-side pravila dozvoljavaju svaku stavku;
- UI moze nuditi ogranicen skup batch akcija: "Submit for review", "Approve", "Publish", "Archive", "Move to draft".

## Admin UI

U `ContentForm`:

1. Zameniti status select novim workflow kontrolama.
2. Za author-only prikazati akciju "Submit for review" umesto status selecta.
3. Za publisher/admin prikazati status ili akcije koje su dozvoljene za trenutno stanje.
4. Labeli:

```text
draft -> Draft
in_review -> In review
approved -> Approved
published -> Published
archived -> Archived
```

5. Homepage switch ostaje disabled dok status nije `published`.
6. Ako je status `in_review`, jasno prikazati da public site jos ne prikazuje sadrzaj.

U `ContentTable` i `ContentTableContainer`:

1. Filter statusa mora imati svih pet statusa.
2. Badge varijante treba da budu citljive:

- `draft`: secondary
- `in_review`: outline ili warning-like ako postoji lokalni pattern
- `approved`: secondary/default po dizajnu
- `published`: default
- `archived`: outline

3. Row actions zameniti direktne "Publish/Unpublish/Archive" sa workflow akcijama:

- Submit for review
- Return to draft
- Approve
- Publish
- Unpublish to draft
- Archive

4. Client-side gating ostaje konzervativan, ali server je izvor istine.

## Public read pravila

Ne menjati public semantiku: samo `published` je public.

Proveriti i azurirati:

- `app/[slug]/page.tsx`
- `app/page.tsx`
- `app/blog-category/[id]/page.tsx`
- `app/search/page.tsx`
- `app/api/search/route.ts`
- `data/content.ts` (`searchPublishedContent`)
- `data/top-menu.ts`
- `app/dashboard/content/_builder/blocks/hero-slider-static.tsx`
- `data/form-submissions.ts`
- `components/blog-comment-form.tsx`

Za sve ostale statuse public mora biti `notFound()` ili empty result, osim kasnije faze 2 preview route-a.

## Hero slider posebna pravila

Hero slider u fazi 1 koristi isti workflow:

- author kreira `draft`;
- author salje u `in_review`;
- publisher/admin odobrava ili publishuje;
- public embed renderuje samo `published`;
- picker u editoru moze prikazati i non-published slidere sa badge statusom, jer je to backend alat.

Ne uvoditi activation window u fazi 1; to ide u fazu 3.

## Testovi

Minimalni testovi:

- author create uvek kreira `draft` cak i ako posalje `published`;
- author moze `draft -> in_review` za svoj content;
- author ne moze `in_review -> approved` ili `published`;
- publisher moze `in_review -> approved` za author content;
- publisher ne moze menjati publisher/admin content ako postojece pravilo to zabranjuje;
- admin moze postaviti `published`;
- homepage ne moze biti `draft`, `in_review`, `approved` ili `archived`;
- public search/list/menu/blog category ne vracaju `draft`, `in_review`, `approved`, `archived`;
- hero slider embed ne renderuje non-`published` slider.

## Acceptance kriterijumi

- U bazi vise nema `unpublished` vrednosti.
- Stari records su mapirani `unpublished -> draft`.
- TypeScript nema preostale union tipove sa `unpublished`.
- UI i API filteri podrzavaju svih pet statusa.
- Svi public entrypointi prikazuju samo `published`.
- Server-side status tranzicije su testirane i ne zavise od client-side UI gatinga.
