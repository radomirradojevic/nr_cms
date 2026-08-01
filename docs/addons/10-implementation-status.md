# Night Raven P0/P1 — implementation status

Poslednje ažuriranje: 2026-07-13  
Program status: **P0/P1 završen, ali rollout nije odobren.**

> `npm run acceptance:local` je završio sa exit kodom `0`. Potvrđeni run `local-20260713102314784-348f52aa15` ima `productionRuntime=false` i `gateEligible=false`: 32/32 lokalna contract scenarija i 7/7 lokalnih drill-ova su prošli preko četiri odvojena loopback HTTP procesa i dve izolovane test baze. Evidence je u `.tmp/night-raven-local-acceptance/local-20260713102314784-348f52aa15`. Ovo nije staging niti production verifikacija; staging ostaje **NOT RUN**, a production nije kontaktiran.

> Strogi release i rollout gate ostaju fail-closed. GitHub workflow definicije sada postoje, ali još nisu izvršene jer nema provisionovanih GitHub Environment-a, self-hosted runnera, vault/KMS reference, provider sandbox-a ni staging identiteta. `npm run acceptance:private-packages` zahteva reference na release signing key fajl, `kid` i javni key-set; `npm run acceptance:invariants` i strogi `npm run acceptance` zahtevaju validan operator-owned staging config.

## Autoritativna lokalna verifikacija — 2026-07-13

| Oblast | Potvrđeni rezultat | Granica dokaza |
|---|---|---|
| Četiri runtime projekta | **PASS mapiranje**: CMS host/build-time registry; privatni Webshop runtime; privatni customer-local LSA runtime; odvojeni centralni Vendor License Service | lokalni obuhvat |
| Root clean-ci/test/typecheck | **PASS**: 287 testova = 285 pass + 2 eksplicitna DB skip-a + 0 fail; typecheck PASS | lokalno |
| Public-copy bez `.private` i `.env*` | **PASS**: `npm run acceptance:public-copy` EXIT 0 sa lokalnim loopback test DSN-om bez lozinke; frozen `npm ci`, typecheck, 287 ukupno = 281 pass + 6 očekivanih private/DB skip-a + 0 fail; Next 16.2.6 build PASS bez NFT warning-a | nije staging/production |
| Webshop install-ready release | **PASS lokalno**: 110/110, payment DB 2/2, clean Next host PASS, 344 runtime modula. Subject `1591c4b15484ba1c9c4cae58d86754bd1b72a57e8d5c9e11267bab1a633f8c6c`; canonical local tgz `a2ef9f66d44034bf8f5aea9ed8fc6dc60a782fbed7496d041b1bca77e739ad92`; aggregate-run ephemeral tgz `3e0d4ca14d8a838b785d24f46d1dd234a6b79fb5577d9b3d88ac2f25f5adc4fa` | efemerno potpisan, nije promotable |
| LSA install-ready release | **PASS lokalno**: release/host typecheck, health/router, `customerLicenseIssuer.v1`, outbox/job i izolovani install; 32 ukupno = 31 pass + 1 DB skip, dedicated DB-local 32/32. Subject `36abde2ad97f3584b997fec5192ca7d1efdbd6aa7c32f871da6ada5c62efb41a`; aggregate ephemeral tgz `93a79591aaec397b22e82b2606debd433ce48fb398293ab818e5a4574c40cd4b` | efemerno potpisan, nije promotable |
| Centralni servis | **PASS lokalno**: 24/24, typecheck i Next build PASS; production security validacija je iza request boundary-ja | bez staging/multi-instance dokaza |
| Migration matrica | **PASS lokalno**: svih 12 versioniranih scenarija za CMS i svih 12 za centralni servis | 24 service-scenario rezultata; nije staging restore |
| SQL/data invarianti | **PASS lokalno**: 5 CMS + 3 centralna upita, svih 8 vraćaju nula prekršaja | staging upiti NOT RUN |
| Redaction/browser/security | **PASS lokalno**: sentinel/security set 20/20, browser scan, limiter/body/SSRF i secret-purpose granice | provider/browser staging NOT RUN |
| Public-copy/NFT harness regresije | **PASS 15/15**: build mora proizvesti NFT manifeste; scan vraća 0 `.private`, 0 `.env` i 0 `next.config.ts` reference i hard-fail-uje na bilo koju zabranjenu putanju | lokalna public boundary |
| GitHub CI/rollout definicije | **KONFIGURISANO, NOT RUN**: pinovani public CI, protected private release, staging acceptance i production preflight workflowi; regresija 2/2 | zahteva GitHub Environment approval i named self-hosted runnere |
| Supply chain / quality | **PASS lokalno**: supply-chain audit; sva 4 projekta `npm audit --omit=dev --audit-level=low` EXIT 0 / `found 0 vulnerabilities`; `npm run lint -- --quiet` PASS; `git diff --check` PASS uz line-ending warning | nije eksterni CI dokaz |
| Lokalni acceptance scenariji | **PASS 32/32**: 18 obaveznih + 14 dodatnih, loopback HTTP, run `local-20260713102314784-348f52aa15` | `productionRuntime=false`, `gateEligible=false` |
| Lokalni drill-ovi | **PASS 7/7**: backup/isolated restore, reconciliation, key rotations, queue recovery i alert delivery | `productionRuntime=false`, `gateEligible=false` |
| Staging acceptance | **NOT RUN**: nema endpoint-a, identiteta, provider sandbox reference, CMS/central staging DB resursa ni operator runner-a | rollout hard stop |

## Status faza

| Faza | As-built status | Potvrđeni lokalni dokaz | Preostala rollout granica |
|---|---|---|---|
| 00 | **P0/P1 remediation završena lokalno** | globalni invarianti, fail-closed config i finalni harness | staging nije provisionovan |
| 01 | Implementirano | payment/refund/duplicate/ordering contract i DB dokazi | stvarni provider sandbox NOT RUN |
| 02 | Implementirano | durable outbox, response-loss, stale worker, DLQ/queue recovery i lokalni restore drill | operator staging recovery NOT RUN |
| 03 | Implementirano | HMAC V2 scope/idempotency, paralelno issue i atomic rollback | staging provisioning NOT RUN |
| 04 | Implementirano | activation concurrency, clone/mismatch, forged signature, bounded grace i rotation contract | stvarni OIDC/provider staging NOT RUN |
| 05 | Install/build granice implementirane | public-copy PASS; Webshop 110/110 + clean host; LSA 31/32 sa očekivanim DB skip-om i 32/32 uz dedicated DB | persistent release authority nije provisionovan |
| 06 | SDK/runtime contract implementiran | capability policy, runtime inventory, checksum/provenance i kriptografska registry verifikacija | registry publish/install staging NOT RUN |
| 07 | Security/operations implementirani | sentinel 20/20, limiter, bounded stream, mapped IPv6, DNS pin, guarded fulfillment/catalog fetch i lokalni drill dokazi | provider/multi-instance staging NOT RUN |
| 08 | Subscription/customer issuer implementiran | cross-client scope, `subscription_created` mapper, customer-local issuer/outbox/delivery | staging delivery/rotation NOT RUN |
| 09 | Harness i lokalna matrica implementirani | 12x2 migracije, 8 zero invariants, 32/32 contract + 7/7 drill | staging gate nije izvršen |

## Migraciono stanje

- CMS journal format `7`, 89 unosa: `0000`–`0088`.
- Centralni servis: `0000_initial`, `0001_addon_product_keys` i remediation `0002`–`0005`.
- `npm run db:migrate:check` prolazi.
- Runner-i hard-fail-uju checksum mismatch; nema production repair/adopt putanje.
- Lokalna matrica prolazi `fresh`, oba upgrade baseline-a, `rerun`, `interrupted_backfill`, `conflict_preflight`, `checksum_mismatch`, `failed_migration_atomic_recovery`, `old_code_read_expand`, `new_code_dual_write`, compatible i incompatible rollback za oba servisa.
- Production i staging migracije nisu pokrenute.

## Release signing granica

Privatni builder-i više ne prihvataju lokalni checksum kao potpis. Obavezni su `NR_ADDON_RELEASE_SIGNING_KEY_FILE` i `NR_ADDON_RELEASE_SIGNING_KID`; verifier dodatno zahteva `NR_ADDON_RELEASE_PUBLIC_KEYS_FILE`. Potpis je Ed25519 nad kanonskim manifestom, a inventory, veličina, svaki file hash, aggregate subject i provenance moraju se poklopiti.

Lokalni wrapper stvara efemernu signing authority samo za izolovanu proveru pipeline-a. Zato LSA manifest nosi lokalni `signingKid`, iako je potpis kriptografski validan. Takav artefakt je namerno `gateEligible=false` i ne sme se promovisati. Za release je potrebna trajna operator-owned authority referenca; vrednost privatnog ključa se ne stavlja u CLI, fixture, repo ili output.

## Test-first ispravke iz završne verifikacije

- centralni Next build je reprodukovao production security validaciju prerano; validacija je pomerena iza `await connection()` request boundary-ja i zaključana testom;
- `subscription_created` reducer rezultat `active` bio je pogrešno mapiran u terminalni status; mapper sada zadržava aktivan entitlement i DB regresija prolazi;
- SSRF guard nije prepoznavao IPv4-mapped IPv6 privatne adrese; dodat je padajući test pa normalizacija i odbijanje;
- odgovor bez `Content-Length` mogao je zaobići deklarisani limit; stream se sada čita uz raw-byte bound i prekida čim pređe limit;
- DNS preflight nije bio vezan za stvarnu konekciju; regresioni test je prvo dokazao rebinding prozor, a pinovani dispatcher i Webshop regenerisani runtime sada prolaze clean host proveru;
- fulfillment i catalog tokovi su mogli direktnim raw `fetch` pozivom zaobići zajednički outbound guard; padajući sentinel je prvo reprodukovao bypass, zatim su oba toka prebačena na guarded/pinned fetch granicu;
- Next 16.2.6 build je reprodukovao `Encountered unexpected file in NFT list` warning iz `lib/file-storage.ts`; leaf filesystem pozivi su označeni `turbopackIgnore` markerima, a ponovljeni root Next build završava EXIT 0 bez warning-a;
- public-copy harness sada zahteva postojanje NFT manifesta posle builda i fail-uje ako scan pronađe `.private`, `.env` ili `next.config.*`. Regresioni harness suite je 15/15, a ponovljeni `npm run acceptance:public-copy` je EXIT 0 sa lokalnim loopback test DSN-om bez lozinke; rezultat nije staging/production dokaz.

## Tačne acceptance komande

```powershell
# Potpuna samostalna lokalna matrica; generiše efemerne ključeve i test resurse.
npm run acceptance:local

# Samo 32 contract scenarija + 7 drill-ova; uvek non-production/non-gate evidence.
npm run acceptance:local:contracts

# Strogi privatni release gate; fail-closed bez key-file/kid/public-key referenci.
npm run acceptance:private-packages

# Strogi staging invariant gate; fail-closed bez NR_ACCEPTANCE_CONFIG_PATH i staging DB referenci.
npm run acceptance:invariants

# Strogi objedinjeni release/staging gate; nije lokalni fallback.
npm run acceptance
```

`npm run acceptance:local` ne postavlja niti simulira `productionRuntime=true`. Lokalni evidence zapisi sadrže UTC vreme, scenario/drill run ID, artifact SHA-256, redigovane resource ID-jeve i metrike, ali su uvek `gateEligible=false`.

## Feature flag i production default granica

- `WEBSHOP_PAYMENT_STATE_V2`
- `WEBSHOP_LICENSE_OUTBOX_V2`
- `VENDOR_LICENSE_API_V2`
- `VENDOR_SIGNED_ENTITLEMENTS_V1`
- `ADDON_INSTALL_RECONCILIATION_V1`
- `ADDON_SDK_V1`

Production Webshop/LSA `enabled`, checkout/storefront i install-mode default-i su fail-closed. Customer CMS u production-u obavezno proverava signed entitlement bez obzira na pokušaj da se `VENDOR_SIGNED_ENTITLEMENTS_V1=false` koristi kao bypass. Flagovi nisu zamena za license enforcement niti rollout dozvola.

## Operator granica i presuda

Nisu kontaktirani staging ili production resursi. Nisu menjani secrets/ključevi, baze, DNS, provider nalozi, backup politika niti deployment. `production-rollout.yml` namerno radi samo production dry-run i zaustavlja se pre mutacije/deploy-a.

**Presuda: P0/P1 završen, ali rollout nije odobren.** Potpuni `npm run acceptance:local` je zelen, uključujući finalne Webshop/LSA artifacte, 32/32 scenarija i 7/7 drill-ova. Bez stvarnog staging endpoint-a, identiteta, provider sandbox-a, obe staging baze, trajne release authority reference i operator-owned evidence-a sistem nije spreman za kontrolisan production canary.
