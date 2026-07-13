# Phase 4 - Revisions and version history

Cilj faze 4 je istorija verzija i restore tok. Ovo je najosetljivija faza jer dotice podatke, edit lock, optimistic concurrency, restore logiku i audit trail.

## Vazna granica

Postojeci `content.version` nije revision history.

Trenutno:

- `content.version` je integer za optimistic concurrency;
- `ContentEditLockProvider` salje `expectedVersion`;
- `updateContentWithVersion` povecava `version`;
- `content_edit_lock_audit` belezi lock dogadjaje i stale save reject.

Ne koristiti `content_edit_lock_audit` kao istoriju sadrzaja. Revisions moraju biti posebni snapshotovi.

## DB model

Dodati tabelu:

```text
content_revisions
```

Preporucena polja:

- `id`: bigint identity primary key
- `contentId`: uuid not null references `content.id` on delete cascade
- `revisionNumber`: integer not null
- `contentVersion`: integer not null
- `contentType`: text not null
- `title`: text not null
- `slug`: text not null
- `categoryId`: uuid nullable ili not null prema snapshot potrebi
- `content`: text nullable
- `contentJson`: jsonb nullable
- `metaTitle`: text nullable
- `metaDescription`: text nullable
- `excerpt`: text nullable
- `coverImage`: text nullable
- `status`: text not null
- `publishedAt`: timestamp with timezone nullable
- `publishAt`: timestamp with timezone nullable, ako je faza 3 implementirana
- `unpublishAt`: timestamp with timezone nullable, ako je faza 3 implementirana
- `homepage`: boolean not null default false
- `visibility`: jsonb not null
- `enableComments`: boolean not null default false
- `autoPublishComments`: boolean not null default false
- `allowAnonymousComments`: boolean not null default false
- `authorId`: text not null
- `updatedBy`: text nullable
- `createdBy`: text not null
- `changeType`: text not null
- `changeNote`: text nullable
- `createdAt`: timestamp with timezone default now

Constraints/indexes:

- unique `(contentId, revisionNumber)`;
- index `(contentId, createdAt desc)`;
- index `(createdBy, createdAt desc)` ako treba audit po useru;
- check `changeType IN (...)`.

Preporuceni `changeType`:

```text
created
saved
submitted_for_review
approved
published
unpublished
archived
scheduled
restored
deleted_snapshot
```

Ako faza 3 nije implementirana, izostaviti `publishAt/unpublishAt` ili ostaviti nullable za buducnost. Ako jeste, snapshot mora ukljuciti schedule polja.

## Snapshot strategija

Preporuka: pre svake mutacije sacuvati snapshot prethodnog stanja.

Razlozi:

- restore moze vratiti stanje pre problematicne izmene;
- brisanje moze sacuvati final snapshot;
- istorija je konzistentna i ako update posle toga failuje treba snapshot raditi u transakciji.

Sve mutacije koje menjaju content treba da idu kroz jedan servis/helper:

```text
data/content-revisions.ts
```

Helperi:

- `createContentRevisionSnapshot(contentId, actorId, changeType, changeNote?)`
- `listContentRevisions(contentId, pagination)`
- `getContentRevision(contentId, revisionId)`
- `restoreContentRevision(contentId, revisionId, actor)`

Ne razbacivati insert u revisions tabelu po UI komponentama.

## Transakcije

Snapshot i update moraju biti u istoj DB transakciji gde je prakticno moguce.

Za `updateContent`:

1. ucitati target;
2. proveriti permission/lock/version;
3. u transakciji:
   - insert revision snapshot starog targeta;
   - update content;
   - bump `content.version`;
4. vratiti novi version.

Za `setStatus`:

1. ucitati target;
2. proveriti transition permission;
3. u transakciji:
   - insert revision snapshot starog targeta sa `changeType` prema tranziciji;
   - update status;
   - bump `content.version` ako status update treba da ucestvuje u concurrency;
4. revalidirati.

Za `deleteContent`:

- pre delete-a sacuvati snapshot sa `changeType = deleted_snapshot`;
- posto tabela ima FK cascade, ako revision treba da prezivi delete, ne sme imati cascade FK. Odluciti pre implementacije.

Preporuka:

- Ako zelite audit posle delete-a, `content_revisions.contentId` ne sme biti cascade FK ili mora imati dodatna polja bez FK zavisnosti.
- Ako je revision history vezan samo za postojece content row-ove, cascade je prihvatljiv.

## Restore pravila

Restore nije samo "copy JSON nazad".

Restore treba da:

- proveri auth;
- proveri da actor sme editovati content;
- proveri edit lock;
- sacuva snapshot trenutnog stanja pre restore-a sa `changeType = restored`;
- vrati polja iz revision snapshota;
- ne sme automatski objaviti ako actor nema publish permission;
- ako revision status nije dozvoljen za actora, restore treba da vrati content kao `draft` ili da odbije restore;
- bumpuje `content.version`;
- revalidira public paths ako je trenutni ili restored status/live stanje public.

Preporucena sigurnija semantika:

- Restore content body/meta/visibility/category/slug iz revisiona.
- Status restore:
  - admin/publisher mogu restore status iz revisiona ako transition pravila dozvoljavaju;
  - author-only restore uvek zavrsava kao `draft`;
  - ako revision status `published`, author restore ga spusta u `draft`.

Slug restore:

- ako revision slug vise nije unique, restore mora vratiti error ili traziti novi slug;
- ne generisati tihi random slug bez UI potvrde.

Homepage restore:

- samo admin moze restore `homepage = true`;
- restored homepage mora biti currently live (`published` i schedule validan ako faza 3 postoji);
- pre restore-a skinuti homepage sa drugih pages u istoj transakciji.

## Admin UI

Dodati tab ili sekciju u content edit page:

```text
History
```

Minimalna lista:

- revision number;
- change type;
- actor;
- created at;
- status u tom trenutku;
- title/slug snapshot;
- actions: "View", "Restore".

Detail view:

- prikaz metadata;
- za blog post: render HTML preview iz `contentJson` ili `content`;
- za page: koristiti postojeci builder renderer u read-only preview modu;
- za hero slider: koristiti `HeroSliderRendererWithMenus` u preview modu;
- prikazati raw JSON samo kao advanced/debug opciju.

Restore UX:

- confirmation dialog;
- upozorenje ako restore menja slug/status/homepage/schedule;
- posle restore-a sync-ovati edit lock version kao i kod normalnog save-a.

## Integracija sa workflow fazama

Faza 1:

- `submitted_for_review`, `approved`, `published`, `archived` mapirati iz status tranzicija.

Faza 2:

- revision detail moze koristiti preview renderer, ali revision preview ne sme kreirati public preview token bez potrebe.

Faza 3:

- snapshot mora cuvati `publishAt` i `unpublishAt`;
- restore schedule polja samo ako actor ima schedule permission.

## Retention

Pre implementacije odluciti retention:

- cuvati sve revisions;
- ili cuvati poslednjih N po contentu plus sve publish/status milestone revisions.

Preporuka za pocetak:

- cuvati sve;
- dodati indexe;
- kasnije dodati retention job ako baza poraste.

## Testovi

Minimalni testovi:

- `updateContent` kreira revision prethodnog stanja;
- `setStatus` kreira revision sa odgovarajucim `changeType`;
- stale save ne kreira revision;
- restore bumpuje `content.version`;
- author restore published revision zavrsava kao `draft`;
- publisher/admin restore published revision postuje transition pravila;
- restore odbija zauzet slug;
- restore homepage moze samo admin;
- delete snapshot ponasanje je testirano prema odabranoj FK/retention semantici;
- revision list je dostupna samo backend korisniku sa pravom pregleda/editovanja tog contenta.

## Acceptance kriterijumi

- Revisions su posebna tabela, ne lock audit.
- Svaka bitna content mutacija ima snapshot.
- Restore je permission-aware i lock/version-aware.
- Revision detail moze prikazati page, blog post i hero slider snapshot.
- Public site se revalidira samo kada restore utice na public-live sadrzaj.
