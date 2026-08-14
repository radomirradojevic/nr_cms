# 06 — Env matrica i završna GO/NO-GO lista

Trenutni PayPal zaključak je **NO-GO za Live**: lokalni P0 kod/release candidate
je zelen, ali realan Sandbox PP-01..PP-18 evidence još nije kompletan. Tačno
stanje je u [Prompt 19 evidence-u](../22-prompt19-paypal-sandbox-evidence-2026-08-14.md).

## 1. Kako koristiti ovu matricu

- Matrica navodi nazive i očekivani oblik, nikad stvarne vrednosti.
- Stvarna vrednost živi u platformskom secret store-u.
- Public URL/KID/hash mogu biti u konfiguracionom manifestu; tajna ne može.
- Root `scripts/validate-runtime-env.mjs`, Master security validator i worker
  config ostaju izvršni autoritet. Ovaj dokument ne zamenjuje validator.
- Svaka production promenljiva mora imati owner-a, purpose, target, environment,
  secret reference/version i rotacionu proceduru.
- Ne kopirati `.env.example.vendor` bez revizije: trenutno namerno sadrži
  `payments=test`, `delivery=fixture` i neusaglašen Vercel/Windows worker model.

## 2. Vendor CMS/Webshop — identitet i core

| Promenljiva | Production zahtev |
| --- | --- |
| `NR_CMS_DEPLOYMENT_PROFILE` | `vendor` |
| `NR_LICENSE_ENVIRONMENT` | `production` |
| `NR_ADDON_SOURCE_MODE` | `registry` |
| `NR_CMS_VERSION` | exact CMS SemVer koji odgovara release-u |
| `NR_CMS_RELEASE_SHA` | exact 40 lowercase hex commit |
| `DATABASE_URL` | vendor runtime role; bez owner/migrator prava |
| `NEXT_PUBLIC_APP_URL` | exact javni HTTPS origin bez path-a |
| `NR_MASTER_LICENSE_URL` | exact Master HTTPS origin |
| `NR_ALLOW_INSECURE_LOOPBACK_HTTP` | `false` ili izostavljeno |
| `NRLS_ALLOWED_OUTBOUND_HOSTS` | minimalna allowlista potrebnih hostova |
| `NRLS_ALLOW_SELF_HOSTED_OUTBOUND` | `false` osim odobrenog self-hosted toka |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | live public key |
| `CLERK_SECRET_KEY` | production secret store |
| `CLERK_WEBHOOK_SECRET` | ako je webhook aktivan; exact endpoint secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | production public site key |
| `TURNSTILE_SECRET_KEY` | production server secret |
| `IP_HASH_SALT` | namenski secret >= 32 karaktera |
| `CRON_SECRET` | core/fulfillment cron purpose; ne deli se sa delivery/revalidation |
| `EMAIL_PROVIDER` | `resend` ili podržani core SMTP |
| `EMAIL_FROM` | adresa na verifikovanom production domenu |
| `RESEND_API_KEY` | production provider secret ako se koristi Resend |
| `STORAGE_PROVIDER` | `vercel-blob` ili dokazani self-hosted storage |
| `BLOB_READ_WRITE_TOKEN` / storage credential | production target-only secret |

`NODE_TLS_REJECT_UNAUTHORIZED=0`, `.nr.test`, local CA i undocumented env su
NO-GO.

## 3. Vendor Webshop — runtime, isporuka i payment

| Promenljiva | Production zahtev |
| --- | --- |
| `WEBSHOP_ENABLED` | `true` posle instalacije; nije rollout kill switch za pending obaveze |
| `WEBSHOP_STOREFRONT_ENABLED` | `false` tokom dark deploy-a, zatim kontrolisan `true` |
| `WEBSHOP_CHECKOUT_ENABLED` | `false` do canary payment gate-a, zatim kontrolisan `true` |
| `WEBSHOP_INSTALL_MODE` | `managed_redeploy` samo uz dokazani adapter |
| `WEBSHOP_DEPLOYMENT_MODE` | mora odgovarati stvarnom adapteru: `vercel` ili `self_hosted` |
| `WEBSHOP_PAYMENTS_MODE` | `live` tek posle zasebnog acceptance-a svakog omogućenog online providera |
| `WEBSHOP_COOKIE_SECURE` | `true` |
| `WEBSHOP_PUBLIC_BASE_URL` | exact javni vendor HTTPS origin |
| `WEBSHOP_CART_TOKEN_SALT` | dedicated secret >= 32 |
| `WEBSHOP_DOWNLOAD_TOKEN_SECRET` | dedicated secret >= 32 |
| `WEBSHOP_DOWNLOAD_EVENT_HASH_SECRET` | dedicated secret >= 32 |
| `WEBSHOP_LICENSE_SERVER_SECRET_KEY` | envelope key za Master API cliente, >= 32 |
| `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KEY` | odvojen 32-byte base64url KEK |
| `WEBSHOP_ISSUED_LICENSE_KEY_ENCRYPTION_KID` | active production KID |
| `WEBSHOP_ISSUED_LICENSE_KEY_DECRYPTION_KEYS_JSON` | protected old KID map; `{}` kada nema overlap-a |
| `WEBSHOP_DELIVERY_WORKER_SECRET` | dedicated >= 32; post-issue bearer |
| `WEBSHOP_POST_ISSUE_LICENSE_STATUS_MAX_AGE_SECONDS` | integer 15..300; tipično 60 posle merenja |
| `WEBSHOP_ENTITLEMENT_REVALIDATION_WORKER_SECRET` | dedicated >= 32 |
| `NR_ADDON_TRANSFER_APPROVAL_SECRET` | dedicated >= 32 |
| `NR_ADDON_TRANSFER_APPROVAL_KID` | safe active production KID |
| `WEBSHOP_DELIVERY_EMAIL_PROVIDER` | `resend`; `fixture` mora fail-closed |
| `WEBSHOP_DELIVERY_EMAIL_FROM` | opciona verifikovana license-delivery adresa |
| `WEBSHOP_RESEND_RECONCILIATION_MAX_PAGES` | integer 1..100; početno 20 uz alarm |
| `WEBSHOP_BUY_URL` | exact `https://<vendor>/licenses/purchase-intents/accept` |
| `WEBSHOP_BUY_OFFER_KEY` | stable `nr-cms-webshop-license` ili odobren stable offer key |
| `WEBSHOP_PURCHASE_INTENT_SESSION_SECRET` | vendor-only dedicated secret |
| `NR_PURCHASE_INTENT_PUBLIC_KEYS_URL` | exact Master well-known keyset URL |
| `WEBSHOP_STRIPE_SECRET_KEY` | live `sk_live_...` u secret store-u |
| `WEBSHOP_STRIPE_WEBHOOK_SECRET` | exact live endpoint `whsec_...` secret |
| `WEBSHOP_PAYPAL_CLIENT_ID` | Live app client ID/reference; nikada Sandbox vrednost u production runtime-u |
| `WEBSHOP_PAYPAL_CLIENT_SECRET` | Live app secret u secret store-u |
| `WEBSHOP_PAYPAL_WEBHOOK_ID` | exact Live webhook ID za vendor endpoint |
| `WEBSHOP_PAYPAL_API_BASE_URL` | standardno izostavljen; ako postoji mora biti exact `https://api-m.paypal.com` u live modu |

Stripe credentiali su obavezni samo ako je Stripe omogućen; PayPal credentiali
su obavezni samo ako je PayPal omogućen. PayPal/Paddle/Monri/bank redirect
credentiale ne provisionovati samo zato što su opcije u kodu. Svaki provider
ima zaseban production acceptance pre enable-a. Trenutni zajednički
`WEBSHOP_PAYMENTS_MODE` zahteva da svi omogućeni online provider-i pripadaju
istom test/live okruženju.

## 4. CMS <-> deployment worker

| Promenljiva | Production zahtev |
| --- | --- |
| `NR_ADDON_DEPLOYMENT_WORKER_URL` | exact public/private-routed HTTPS worker origin, bez path-a |
| `NR_ADDON_DEPLOYMENT_WORKER_AUTH_KID` | target-specific request KID |
| `NR_ADDON_DEPLOYMENT_WORKER_AUTH_SECRET` | target-specific request secret >= 32 |
| `WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID` | target-specific callback KID, različit od request KID-a |
| `WEBSHOP_DEPLOYMENT_RESULT_AUTH_SECRET` | target-specific callback secret >= 32 |
| `WEBSHOP_DEPLOYMENT_RESULT_AUTH_OLD_SECRETS_JSON` | old KID map samo kroz bounded overlap |
| `NR_ADDON_INSTALLATION_ENCRYPTION_KEY` | target-specific 32-byte base64url KEK |
| `NR_ADDON_INSTALLATION_ENCRYPTION_KID` | active production KID |

Opcioni `WEBSHOP_REDEPLOY_*` callback se ne konfiguriše paralelno kao drugi
nedokumentovani deployment autoritet. Ako izabrani provider adapter koristi taj
ugovor, njegov state/ownership/idempotency mora biti jasno dokumentovan i testiran.

## 5. Customer CMS

Za svaki customer target važi isti core/installation/worker contract, ali:

- `NR_CMS_DEPLOYMENT_PROFILE=client`;
- canonical `NEXT_PUBLIC_APP_URL` je customer domen;
- ima sopstveni DB/runtime/storage/Clerk/secrets/installation identitet;
- outbound Master/worker allowlista pripada tom targetu;
- request/result HMAC i installation KEK nisu vendor vrednosti;
- deployment adapter/platforma mora biti eksplicitno podržana;
- customer bez sopstvene prodavnice ne dobija vendor Stripe/Resend/API secrets;
- `WEBSHOP_STOREFRONT_ENABLED` i `WEBSHOP_CHECKOUT_ENABLED` zavise od njegove
  poslovne upotrebe, ne od licence za instalaciju add-on-a.

Ne postoji jedan globalni `client` production target ako se prodaje više
instalacija; worker policy mora identifikovati svaku instalaciju, trust zonu i
canonical domain.

## 6. Master License Server

| Promenljiva | Production zahtev |
| --- | --- |
| `NRLS_ENVIRONMENT` | `production` |
| `NRLS_PUBLIC_URL` | exact Master HTTPS origin |
| `DATABASE_URL` | Master web runtime DB role |
| `NR_MIGRATION_*` | exact production resource/host/database/provider binding za migrator |
| `NRLS_SECRET_ENCRYPTION_KEY` | active 32-byte KEK |
| `NRLS_SECRET_ENCRYPTION_KID` | active production KID |
| `NRLS_SECRET_DECRYPTION_KEYS_JSON` | old KID map, bez active KID-a |
| `NRLS_RATE_LIMIT_STORE` | shared persistent store, trenutno `postgres` |
| `NRLS_NONCE_CLEANUP_CRON_SECRET` | dedicated scheduler secret |
| `NRLS_VENDOR_SIGNING_PRIVATE_KEY` | entitlement/lifecycle Ed25519 private key |
| `NRLS_VENDOR_SIGNING_KID` | active production KID |
| `NRLS_ENTITLEMENT_PUBLIC_KEYSET_FILE` | protected/public trusted keyset path |
| `NRLS_ENTITLEMENT_PUBLIC_KEYSET_SHA256` | exact file hash |
| `NRLS_PURCHASE_INTENT_SIGNING_PRIVATE_KEY` | drugi Ed25519 private key |
| `NRLS_PURCHASE_INTENT_SIGNING_KID` | drugi active production KID |
| `NRLS_PURCHASE_INTENT_PUBLIC_KEYSET_FILE` | purchase trust keyset path |
| `NRLS_PURCHASE_INTENT_PUBLIC_KEYSET_SHA256` | exact file hash |
| `NRLS_ADDON_RELEASE_PUBLIC_KEYS_FILE` | release authority public keyset |
| `NRLS_ADDON_RELEASE_PUBLIC_KEYS_SHA256` | exact file hash |
| `NRLS_ADDON_RELEASE_ALLOWED_KIDS` | comma-separated production KID allowlist |
| `NRLS_RELEASE_OPERATOR_DB_ROLE` | exact least-privilege CLI role |
| `NRLS_RELEASE_OPERATOR_DATABASE_URL_FILE` | ACL-protected one-line DB URL path |

Lifecycle TTL/replay/grace promenljive, ako se override-uju, moraju ostati u
granicama Master validatora i replay retention mora pokriti receipt TTL.

## 7. Deployment worker

Ova matrica je cilj posle code gap refaktora:

| Promenljiva | Production zahtev |
| --- | --- |
| `NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT` | `production` |
| `NR_ADDON_DEPLOYMENT_WORKER_DATABASE_URL` | dedicated worker runtime DB; bez `_test` |
| `NR_ADDON_DEPLOYMENT_WORKER_PUBLIC_URL` | exact worker HTTPS origin; bez `.nr.test` |
| `NR_ADDON_DEPLOYMENT_WORKER_PORT` | validan interni listen port |
| `NR_ADDON_DEPLOYMENT_WORKER_TARGETS_FILE` | absolute, ACL-protected, regular non-link file |
| `NR_ADDON_DEPLOYMENT_WORKER_TARGETS_SHA256` | exact lowercase SHA-256 |
| `NR_ADDON_DEPLOYMENT_WORKER_SECRET_RESOLVER` | allowlistovan production resolver literal |
| `NR_ADDON_DEPLOYMENT_WORKER_SECRET_ROOT` | protected root, kada koristi OS resolver |
| `NR_ADDON_DEPLOYMENT_WORKER_DPAPI_HELPER_PATH` | hash-pinovan helper, samo Windows model |
| `NR_ADDON_DEPLOYMENT_WORKER_DPAPI_HELPER_SHA256` | obavezan u production Windows profilu |

`NR_ADDON_DEPLOYMENT_WORKER_TEST_SECRET_MAP_JSON` je zabranjen.

## 8. Release authority

Tačne vrednosti zavise od implementiranog authority profila, ali production mora
imati:

- `NR_ADDON_RELEASE_AUTHORITY_MODE=production`;
- protected release signing key handle/file;
- `NR_ADDON_RELEASE_SIGNING_KID` bez local/test prefiksa;
- `NR_ADDON_RELEASE_PRODUCTION_KIDS` sa aktivnim KID-om;
- hash-pinovan release public keyset;
- GitHub token minimalnog packages/releases scope-a;
- clean checkout i odvojeni npm config/registry credential;
- bez Master mutation credentiala u CI-u.

Komande/parametri iz [dokumenta 15](../15-solo-maintainer-release-authority.md)
imaju prednost nad ovim sažetkom.

## 9. Preflight komande

Pokretati iz clean checkout-a/repoa sa production-like env references, bez
ispisivanja vrednosti.

### CMS

```powershell
npm ci
npm run env:validate
npm run db:core:runtime-check
npm run db:migrate:check
npm run typecheck
npm run lint
npm run test
npm run build
npm run deploy:verify
npm run supply-chain:audit
```

Migration dry-run/production migracija se izvršava samo sa odobrenim operator
credentialom i backup-om, kroz postojeće `db:migrate:production:dry-run` i
`db:migrate:production` procedure.

### Webshop source/release

```powershell
npm ci
npm run typecheck
npm run test
npm run build:check
npm run pack:verify
npm run install:verify:next
npm run release:authority:preflight
```

`release:authority:publish` je spoljašnja mutacija i zahteva posebno odobrenje.

### Master

```powershell
npm ci
npm run env:validate
npm run typecheck
npm run test
npm run test:db
npm run build
npm run db:migrate:production:dry-run
npm run release:preflight
```

`db:migrate:production`, `release:import`, `release:publish` i `release:withdraw`
su odvojene operator mutacije.

### Worker

```powershell
npm ci
npm run env:validate
npm run typecheck
npm run lint
npm run test
npm run test:db
npm run test:integration
npm run test:windows-service-adapter
npm run build
npm run db:migrate:check
npm run db:restore:verify
```

Ako je production adapter Vercel/drugi provider, mora imati sopstveni test umesto
lažnog oslanjanja na Windows service test.

## 10. Završna GO/NO-GO lista

### Arhitektura i kod

- [ ] ADR određuje vendor/Master/worker/customer hosting i prvi podržani adapter.
- [ ] Worker production profil nema `.nr.test`, `_test`, tačno-dva-target i lokalne
  service/port/path hardcode-ove.
- [ ] Vercel ili self-hosted deployment mode odgovara stvarno testiranom adapteru.
- [ ] Production env validator odbija `fixture` e-mail, local/test KID/URL/DB.
- [ ] Novi code gap change-set ima novu Webshop SemVer/Master release evidence.
- [ ] Sva četiri relevantna repoa su na odobrenim clean commitima.

### Domeni i mreža

- [ ] Svi origin-i imaju javni DNS, validan CA/TLS i monitoring isteka.
- [ ] Well-known proof prolazi kao `https_well_known` sa Master mreže.
- [ ] Private/mixed DNS, redirect, invalid cert i pogrešan proof fail-closed.
- [ ] SSRF/egress allowliste su minimalne i DNS pinning testovi zeleni.
- [ ] Proxy ne menja Stripe/PayPal webhook body ili verification headere niti
  loguje secure delivery path/token.

### Ključevi i pristup

- [ ] Production KID/keyset matrica ima owner-e i nema development vrednosti.
- [ ] Entitlement, purchase, release, HMAC i KEK purpose-i su odvojeni.
- [ ] Active/old/revoked rotation testovi prolaze.
- [ ] Secret/KMS/DPAPI ACL i service identities su dokazani.
- [ ] Backup/restore uključuje odgovarajuće key verzije.
- [ ] Secret scan/log/APM dokaz je čist.

### Podaci i worker

- [ ] CMS/Master/worker baze i owner/migrator/runtime/backup role su odvojeni.
- [ ] Fresh/upgrade migration i schema/privilege drift testovi prolaze.
- [ ] Worker package verify/build/migrate/switch/health/reconcile/rollback E2E prolazi.
- [ ] Epoch/generation/fence/mutex/lease/result invarianti prolaze posle restarta.
- [ ] DB/storage/secret/worker restore drill je prošao sa izmerenim RPO/RTO.

### Payment provider-i i e-mail

- [ ] ADR bira najmanje jedan početni live provider i dokumentuje pravni
  subjekt, valute, naknade, payout, refund/dispute owner-e i kill switch.
- [ ] Ako je Stripe omogućen: business/live account, MFA, live keys, exact
  endpoint/eventi i matching webhook secret su spremni prema dokumentu 03.
- [ ] Ako je PayPal omogućen: Prompt 19 real-Sandbox matrica je PASS, Business
  nalog je verified bez limitation-a, MFA/payout su spremni, a Live app i exact
  webhook ID pripadaju produkcijskom endpoint-u prema dokumentu 07.
- [ ] PayPal approved/pending bez completed capture-a ne izdaje licencu;
  return/webhook redosled i duplicate daju jedan capture aggregate.
- [ ] Kontrolisani live capture izabranog providera izdaje tačno jednu licencu.
- [ ] Refund/dispute/lifecycle/revalidation su provereni zasebno za svaki
  omogućeni provider.
- [ ] Provider OAuth/API/webhook tajne i PayPal buyer PII nisu u safe metadata,
  logu, APM-u ili evidence-u.
- [ ] Resend domen ima DKIM/SPF/DMARC i provider alerting.
- [ ] Delivery send/retrieve/unknown/duplicate/expired-token testovi prolaze.
- [ ] Raw ključ nije u e-mailu, provider metadata, logu ili evidence-u.

### Observability i operacije

- [ ] Structured logs ulaze u redigovan collector.
- [ ] Payment/issue/delivery/worker/revalidation/key/backup dashboard-i rade.
- [ ] Paid-but-unissued, DLQ, invalid signature, stale lease, key/cert expiry,
  backup failure i delivery backlog alarmi su testirani.
- [ ] Incident runbook owner/on-call kanal i kill switch su poznati.
- [ ] Threat-model nema otvoren critical/high NO-GO.

### Staging i rollout

- [ ] Pun javni staging Prompt 18 tok i negativna matrica su zeleni.
- [ ] PayPal Sandbox E2E i PP-01..PP-18 evidence su zeleni pre bilo kog PayPal
  Live credentiala/canary-ja; nedostupan dispute-real scenario je eksplicitan
  NO-GO ili odobren manual-review rizik, ne prećutni PASS.
- [ ] Production dark deploy je zdrav sa storefront/checkout zatvorenim.
- [ ] Release package/Master publish/target deploy imaju odvojena odobrenja.
- [ ] Canary target/payment/refund i monitoring period su zeleni.
- [ ] Rollback/forward-fix plan i previous compatible release su dostupni.
- [ ] Finalni redigovani evidence paket i eksplicitni operator GO su sačuvani.

## 11. Konačna odluka

`GO` se daje samo ako su sve obavezne stavke čekirane dokazom. Ako production
worker adapter, javni proof, live payment, e-mail reconciliation, restore ili
alerting nisu dokazani, status ostaje **NO-GO**, bez obzira što lokalni Prompt 18
ima PASS.
