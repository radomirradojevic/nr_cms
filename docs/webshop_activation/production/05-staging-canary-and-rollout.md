# 05 — Staging, canary, produkcijski E2E i rollout

Trenutni PayPal status: Webshop `0.6.25` P0 code gate je **PASS-LOCAL**, ali
stvarni Sandbox buyer/capture/signed-webhook/refund dokaz je **NO-GO / NOT
EXECUTED**. Videti [dated Prompt 19 evidence](../22-prompt19-paypal-sandbox-evidence-2026-08-14.md).

## 1. Environment-i

Potrebna su najmanje tri kriptografski i podatkovno odvojena okruženja:

| Environment | Namena | Payment | Domen/CA | Ključevi/podaci |
| --- | --- | --- | --- | --- |
| development | lokalni Prompt 18/regression | Stripe test; PayPal tek kroz zaseban Sandbox E2E | `.nr.test`, lokalni CA ili ograničen javni webhook ingress | local-only, synthetic |
| staging | production-like javna validacija | Stripe test i/ili PayPal Sandbox, svaki sa zasebnim acceptance-om | javni staging domeni i CA | staging-only, synthetic |
| production | stvarni kupci i novac | najmanje jedan zasebno odobren Live provider; PayPal ili Stripe | javni production domeni i CA | production-only |

Staging ne koristi production DB dump sa PII osim kroz odobrenu anonimizaciju.
Production secret ne sme biti potreban da staging test prođe.

## 2. Staging mora ličiti na production

Isto kao production:

- hosting/deployment adapter;
- Node/npm/Next/CMS/Webshop package verzije;
- DB engine/version/schema/role matrica;
- javni DNS/TLS/well-known proof;
- proxy/CDN/WAF raw webhook ponašanje;
- secret resolver vrsta i KID/keyset ugovor;
- scheduler/outbox/worker procesni model;
- Resend adapter i retrieval reconciliation;
- observability/backup sistemi;
- release authority i Master import/publish proces, sa staging-only trust key-em
  ako je odvojen katalog.

Razlikuju se samo environment, domeni, accounti, keys i podaci.

## 3. Change-set redosled pre staging E2E-a

1. Worker production profile/adapter i test-marker fail-closed provere.
2. Production env validator odbija fixture e-mail i local/test KID/URL/DB.
3. Verzija Webshop paketa se povećava jer se package bytes menjaju.
4. Svi repo testovi/build/package/isolated host prolaze.
5. Local Prompt 18 regression se ponavlja za pogođene tokove.
6. Release authority proizvodi novi immutable paket/tag/attestation.
7. Master importuje draft, operator odvojeno publish-uje staging-eligible release.
8. Staging baze/migracije/backup/worker policy/secrets se provisionuju.
9. Tek tada počinje puni staging E2E.

Ne patchovati aktivni `node_modules`, current release ili produkcijsku bazu.

## 4. Staging E2E

Ponoviti glavni Prompt 18 tok sa javnom infrastrukturom:

1. clean Master/vendor/worker/customer start iz immutable targeta;
2. production-like KID/keyset/allowlist, ali staging vrednosti;
3. domain activation koristi `https_well_known`, ne development exemption;
4. worker install exact hosted package, migration i terminal receipt;
5. vendor product ima četiri SKU varijante i stable catalog/ETag;
6. browser Buy koristi signed purchase intent POST bez tokena u URL-u;
7. `webshop-365` checkout koristi test okruženje izabranog providera; PayPal
   rollout koristi PayPal Sandbox nalog i javni webhook prema dokumentu 20,
   dok postojeći lokalni Stripe Prompt 18 dokaz ostaje zasebno sačuvan;
8. captured reducer izdaje tačno jednu licencu;
9. Resend šalje jedan secure link i retrieval reconciliation potvrđuje message;
10. kupac reveal-uje ključ i aktivira customer CMS;
11. customer hosted package deployment završava `ready`;
12. refund/dispute fixture i provider refund scenario daju očekivan lifecycle;
13. backup/restore/rollback, key rotation i alert drill prolaze.

### Obavezne negativne grane

- private/mixed DNS, invalid cert, redirect, pogrešan proof;
- wrong environment/issuer/audience/KID/keyset hash;
- Stripe i PayPal invalid signature, duplicate/out-of-order/partial/failed/canceled;
- PayPal approved/pending bez completed capture-a, forged return order token,
  nebezbedan approval URL i Sandbox/Live host mismatch;
- provider/webhook response loss;
- issue/notification unknown commit;
- worker crash pre/post migracije/switch-a/callback-a;
- stale epoch/generation/installation callback;
- DB lease/mutex timeout i DLQ;
- e-mail duplicate, not-found/unknown retrieval, expired token;
- Master outage/revalidation grace/restart;
- rollback compatible/incompatible i restored stale fence;
- tajna/token/license key u log/APM scan-u.

## 5. Production provisioning bez saobraćaja

Pre deploy-a:

1. kreirati production DNS/TLS, baze/role, storage i secrets;
2. provisionovati production Master keysets, allowliste i release operatora;
3. provisionovati worker target policy/hash, adapter i secret refs;
4. kreirati Live webhook/credential samo za izabrani i prihvaćeni provider
   (PayPal prema dokumentu 07 ili Stripe prema dokumentu 03) i Resend verified
   domen/credential;
5. povezati backup i observability;
6. postaviti storefront/checkout fail-closed:

```text
WEBSHOP_ENABLED=true
WEBSHOP_STOREFRONT_ENABLED=false
WEBSHOP_CHECKOUT_ENABLED=false
WEBSHOP_PAYMENTS_MODE=live
```

7. pokrenuti env/preflight/migration dry-run iz tačnog release-a;
8. napraviti pre-deploy backup;
9. deployovati vendor/Master/worker u dark režimu;
10. proveriti health, keyset, catalog, scheduler i alert bez live ordera.

## 6. Produkcijski release gate

Za novi Webshop release:

1. clean authority checkout sa `core.autocrlf=false` i LF migration dokazom;
2. test/typecheck/build/pack/reproducibility/supply-chain gate;
3. production release signing KID active i allowlistovan;
4. package publish daje exact registry version ID/digest;
5. GitHub Release ostaje evidence carrier prema authority ugovoru;
6. Master `release:import` kreira samo draft;
7. operator pregleda evidence i odvojeno radi `release:publish`;
8. stable selector bira očekivanu verziju bez implicitnog downgrade-a;
9. worker pre deploy-a ponovo verifikuje hosted bytes i evidence;
10. release ID/version/hash/KID/schema/compatibility tuple ulazi u rollout zapis.

Package publish, Master publish i target deploy nisu jedno odobrenje.

## 7. Canary strategija

Preporučeni početak:

1. author-owned vendor target bez javnog checkout-a;
2. jedna interna/canary customer instalacija;
3. jedan ograničen SKU/proizvod;
4. kratak operativni prozor kada su owner-i za Master, worker, izabrani payment
   provider, e-mail i DB dostupni;
5. unapred definisan stop/rollback kriterijum.

Posle dark health-a:

1. uključiti storefront za internu proveru, checkout ostaje zatvoren;
2. proveriti javni Buy/purchase-intent/domain proof bez plaćanja;
3. otvoriti checkout samo za kontrolisani smoke;
4. izvršiti jednu realnu minimalnu uplatu;
5. čekati autoritativni webhook/reducer/issue/mail/reveal/deploy, bez ručnog
   preskakanja;
6. izvršiti refund i lifecycle proveru;
7. pratiti SLO/alarme najmanje dogovoreni canary period;
8. tek uz pisani GO otvoriti checkout širem saobraćaju.

## 8. Produkcijski smoke dokaz

Zapis mora sadržati bez tajni:

- canonical domene i `https_well_known` evidence hash;
- source commitove, package/tag/digest/registry version ID;
- Master release ID/KID/keyset hash;
- vendor/customer installation/activation/operation/job ID;
- epoch/generation, desired/installed release tuple i terminal receipt;
- payment provider/app/webhook/order/session/capture/event/refund reference,
  amount/currency i reducer status bez payment credentiala ili buyer PII-ja;
- order/item/JTI/entitlement ID bez raw ključa;
- e-mail provider message ID i reconciliation status bez delivery tokena;
- reveal/activation rezultat bez licence;
- refund/lifecycle/revalidation rezultat;
- backup ID/hash, restore/rollback reference;
- dashboard/alert snapshot bez PII/high-cardinality tajni;
- operator odobrenje i otvorene rizike.

## 9. Stop/rollback kriterijumi

Odmah zatvoriti novi checkout ako:

- invalid Stripe/PayPal signature ili payment mismatch nije objašnjen;
- PayPal account limitation, Live/Sandbox mismatch ili completed capture bez
  canonical capture evidence nije objašnjen;
- captured order ostane unissued preko SLO-a;
- duplicate entitlement/license nastane;
- delivery pošalje više poruka/ključeva ili token procuri;
- worker ima DLQ, stale fence, neoslobođen lease/mutex ili drugi terminal writer;
- desired/installed release/hash/schema nisu jednaki očekivanom;
- domain proof/issuer/KID/environment mismatch;
- Master/CMS/worker backup nije obnovljiv;
- critical/high security incident ili secret/log leak;
- monitoring/alerting ne radi tokom canary-ja.

### Tehnički rollback

- pre migracije/switch-a: zadržati aktivni release, retry/karantin novog;
- posle expand migracije: vratiti samo schema-compatible prethodni release;
- incompatible schema: maintenance + forward fix, bez ad-hoc down SQL-a;
- failed new selection: withdraw release iz budućeg izbora, ne briše postojeće
  installation/audit podatke;
- worker/CMS callback se reconcile-uje originalnim operation/epoch/generation
  tuple-om.

### Poslovni rollback

Captured payment i izdata licenca ne nestaju code rollback-om. Koristiti
idempotent delivery, refund/revoke/compensation i customer-support audit. Nikada
ne brisati order/payment/entitlement redove da bi dashboard izgledao zeleno.

## 10. Širenje rollout-a

Posle canary GO-a:

- rollout po batch-u/platformskom adapteru;
- proveriti backup i health pre svakog targeta;
- pratiti queue/revalidation/rollback/payment-provider/e-mail metrike između batch-eva;
- ne uvoditi nov provider/region/adapter u istom rollout-u;
- zadržati prethodni kompatibilni immutable release do isteka rollback prozora;
- dokumentovati svaku target verziju i terminal receipt;
- finalni GO ne ukida incident/kill switch i periodične restore/rotation testove.
