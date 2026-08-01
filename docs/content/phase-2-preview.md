# Phase 2 - Preview

Cilj faze 2 je pravi frontend preview za `draft`, `in_review` i `approved` content bez javne objave. Ovo se radi tek nakon faze 1, jer preview mora razumeti novi workflow.

## Trenutno stanje

`app/[slug]/page.tsx` trenutno ima helper `canPreviewUnpublishedContent`, ali ovlascenom korisniku za `unpublished` prikazuje samo `ContentUnpublished` poruku sa linkom za edit. To nije pravi preview.

Editor ima interne previewe:

- page builder preview u `ContentForm` / `PageEditor`;
- blog editor preview kroz Tiptap editor;
- hero slider editor preview;
- hero slider picker preview u `fetchHeroSliderPreview`.

Ali ne postoji zasticena public-like preview ruta koja renderuje isti shell/template kao frontend.

## Ciljni model

Dodati zasticeni preview URL koji renderuje isti frontend kao public content, ali samo za ovlascene backend korisnike ili preko kratkotrajnog tokena.

Preporuceni pristup:

```text
/api/content-preview-tokens
/preview/content/[token]
```

Alternativno:

```text
/preview/[id]?token=...
```

Izabrati jedan model i drzati ga konzistentnim.

## DB model

Preporucena nova tabela:

```text
content_preview_tokens
```

Polja:

- `id`: uuid primary key
- `contentId`: uuid references `content.id` on delete cascade
- `tokenHash`: text unique not null
- `createdBy`: text not null
- `expiresAt`: timestamp with timezone not null
- `usedAt`: timestamp with timezone nullable, ako se zeli one-time token
- `createdAt`: timestamp with timezone default now

Token ne cuvati u plain text-u. Cuvati hash, a raw token prikazati samo pri kreiranju URL-a.

Ako se odabere session-only preview bez tokena, tabela nije neophodna, ali tada URL nije pogodan za deljenje unutar tima. Preporuka je token tabela.

## Auth i permissions

Preview token sme kreirati:

- admin za bilo koji content;
- publisher za content koji sme da edituje/pregleda po postojecim pravilima;
- author samo za sopstveni content.

Preview route mora proveriti:

- token postoji;
- token nije istekao;
- content postoji;
- content nije `archived`, osim ako admin eksplicitno generise archive preview;
- content visibility se moze ignorisati za backend preview ako token predstavlja urednicko ovlascenje, ali to dokumentovati.

Ako se koristi session-based preview bez tokena, koristiti ista pravila kao `canEdit`/`canPreview`.

## Render arhitektura

Da se ne duplira render logika, izvuci zajednicki renderer iz `app/[slug]/page.tsx`.

Predlog:

```text
app/[slug]/content-renderer.tsx
```

ili:

```text
components/content-public-renderer.tsx
```

Renderer prima:

- content row;
- resolved global settings;
- opcije `preview: boolean`;
- opcioni preview banner metadata.

Koristi isti rendering za:

- `page`: `PageTemplate` + `BuilderRender`;
- `blog_post`: `BlogPostTemplate` + `BlogContent` + komentari iskljuceni ili read-only u previewu;
- `hero_slider`: `PageTemplate` + `HeroSliderRendererWithMenus`.

U preview modu:

- ne prikazivati comment form kao aktivan public workflow;
- ne slati preview sadrzaj u search/menu;
- dodati `noindex,nofollow` metadata;
- dodati cache control `no-store` za route/response gde je primenljivo.

## Routes

1. `app/api/content-preview-tokens/route.ts`

- `POST` prima `{ contentId }`;
- proverava `auth()` / current user;
- validira permission;
- generise raw token;
- cuva hash i expiry;
- vraca preview URL.

2. `app/preview/content/[token]/page.tsx`

- `params` tretirati kao Promise;
- hash-uje token;
- ucitava token + content;
- proverava expiry;
- renderuje content preko zajednickog renderera;
- ako failuje, `notFound()`.

3. Ne koristiti `middleware.ts`. Ako bude potreban globalni guard, koristiti `proxy.ts` prema projektnim pravilima.

## Admin UI

Dodati preview akcije u:

- `app/dashboard/content/content-form.tsx`
- `app/dashboard/content/content-row-actions.tsx`

Preporuka:

- dugme "Preview" u editoru za sve statuse osim mozda `archived`;
- row action "Preview" za backend korisnike koji imaju pravo pregleda;
- preview otvarati u novom tabu;
- ako token kreiranje failuje, prikazati error toast ili inline error.

Za `published` content preview moze i dalje generisati preview URL, ali obican public link vec postoji. Jasno razlikovati "Open public" i "Preview draft".

## Hero slider preview

Hero slider ima dva preview scenarija:

1. Direktni preview same hero slider stranice.
2. Preview page-a u koji je hero slider ubacen.

Za fazu 2 implementirati prvo direktni preview same hero slider stranice, jer `app/[slug]/page.tsx` vec zna da renderuje `contentType === "hero_slider"`.

Za page builder embed:

- ako preview page renderuje draft page, `HeroSliderStatic` i dalje trazi `row.status === "published"` za embedded slider;
- za potpuni draft preview potrebno je prosiriti renderer da u preview modu dozvoli embedded hero slider koji je takodje previewable;
- ne raditi to implicitno bez permission checka.

Preporuceni fazni minimum:

- draft page preview renderuje page content;
- embedded hero slider ostaje vidljiv samo ako je published;
- posebno dokumentovati ogranicenje;
- kasnije dodati preview override za embedded draft hero slider ako editori to traze.

## SEO i cache

Preview stranice:

- `robots: { index: false, follow: false }` u metadata;
- `no-store` za token API;
- ne koristiti ISR cache za preview;
- ne revalidirati public paths pri samom previewu.

## Security checklist

- Token raw value se prikazuje samo jednom.
- Token hash je unique.
- Token expiry default 15-60 minuta.
- Token route ne prihvata arbitrary slug bez permission checka.
- Preview nikad ne menja content status.
- Preview nikad ne postavlja `publishedAt`.
- Preview ne bypass-uje file access pravila osim ako su fajlovi vec public.
- Preview ne curi kroz `app/api/search`, top menu ili blog category.

## Testovi

Minimalni testovi:

- author moze kreirati preview token za sopstveni draft;
- author ne moze kreirati preview token za tudji content;
- publisher moze preview author content koji sme da edituje;
- expired token vraca 404;
- invalid token vraca 404;
- preview route renderuje `draft`, `in_review`, `approved`;
- preview route ne renderuje `archived` osim ako je eksplicitno dozvoljeno za admin;
- public slug route i dalje ne renderuje non-`published`;
- preview metadata je noindex.

## Acceptance kriterijumi

- Backend korisnik moze otvoriti public-like preview bez objave.
- Public URL za isti content i dalje vraca 404 dok status nije `published`.
- Preview token je vremenski ogranicen i ne cuva se plain text.
- Page, blog post i direktni hero slider preview rade.
- Embedded draft hero slider ogranicenje je ili reseno ili jasno dokumentovano u UI/README za fazu.
