# Prompt 19 — PayPal Sandbox E2E evidence, 2026-08-14

## 1. Rezultat

**PAYPAL P0 CODE GATE: PASS (LOCAL)**  
**PAYPAL REAL-SANDBOX E2E: BLOCKED / NOT EXECUTED**  
**PAYPAL LIVE I PRODUKCIJA: NO-GO**

Lokalni PayPal V2 adapter, reducer ugovori, bezbednosne provere i release
candidate su završeni i regresije su zelene. Stvarni PayPal Sandbox tok nije
predstavljen kao PASS: vendor test runtime nema provisionovane Sandbox
credentiale i webhook ID, a ne postoji ni odobren javni HTTPS webhook ingress.

Ovaj dokument ne menja završni Stripe Prompt 18 dokaz. On beleži tačno šta je
dokazano za PayPal i šta još zahteva spoljašnji Sandbox/operator korak.

## 2. Tačan source i release-candidate tuple

| Polje | Vrednost |
| --- | --- |
| Webshop source commit | `95002515c2eee56f9c4fe31b4a1a2c082bf2bea3` |
| Commit opis | `Harden PayPal Sandbox payment lifecycle` |
| Source branch | `master-ws` |
| Package | `@radomirradojevic/webshop@0.6.25` |
| Release ID | `6ffc5379-09ae-596b-86fa-2ef7fabe3e08` |
| Artifact SHA-256 | `015ff49cb3d392e833b47d2446662ee97b42ef4be037f03e8b5dc3f60fc39ef7` |
| Tarball SHA-256 | `d450bd09f2798db3c4d61e1ecc94534017c37068fed358189f5ea16e7a17f217` |
| npm integrity | `sha512-CJqBOGqJZA7ltMehCwphCkNzPQo3cyos6cTYyZOGqEcOWbt+nBw4L/HeFvP0J5Touuu2L3AMzB8BF5EpnSLtFQ==` |
| Dependency lock SHA-256 | `5d419a3afe432bbe0c9cfafb1669e525e18697f4839d1487991f67bafa9fd87d` |
| Migration bundle SHA-256 | `2c3237a859c4679f7d41a17cb7b30cb2846bb07fd6d5f744f952be65c190f2a2` |

Ovo je lokalno verifikovan release candidate. Paket `0.6.25` nije objavljen,
release nije importovan/publikovan u Master, target nije redeployovan i Git
push nije izvršen u ovom Prompt 19 prolazu. Sve su to zasebne spoljašnje
mutacije koje zahtevaju eksplicitno odobrenje.

## 3. Implementirani P0 ugovori

- Direct capture i podržani PayPal webhookovi emituju kompletan
  `NormalizedPaymentEventV2` sa provider/order/capture/transaction referencama,
  provider vremenom, amount/currency i stabilnim event ID-em.
- `CHECKOUT.ORDER.APPROVED` i `PAYMENT.CAPTURE.PENDING` ne izdaju licencu;
  issuance je moguć tek posle autoritativnog completed capture-a.
- Refund pending/completed/failed koristi PayPal refund ID, originalni capture
  binding i amount/currency; partial/full agregati ostaju konzistentni.
- `CUSTOMER.DISPUTE.CREATED|UPDATED|RESOLVED` se vezuje za originalni seller
  transaction. Nedvosmisleni ishodi mapiraju open/won/lost, a nepoznat ili
  dvosmislen ishod ostaje ignored/manual-review umesto nagađanja.
- Lokalni `confirmationToken` i PayPal `token=<ORDER_ID>` su razdvojeni.
  Callback mora vezati PayPal token za durable `providerReference` pre capture-a.
- Test mode prihvata samo `https://api-m.sandbox.paypal.com`, a live samo
  `https://api-m.paypal.com`. Approval i webhook certificate URL-ovi imaju
  mode-specifičnu host allowlistu.
- Create/capture/refund koriste stabilne `PayPal-Request-Id` vrednosti.
- Bezbedni metadata je stroga allowlista. Ceo provider payload, payer/payee
  e-mail/adresa, OAuth podaci i approval token se ne čuvaju kao safe metadata.
- Isti PayPal capture primljen kroz return i webhook ulazi u finansijski
  aggregate tačno jednom.
- Completed capture sa amount/currency mismatch-om fail-closed pada pre
  fulfillment/issuance-a.

## 4. Lokalni test i build dokaz

| Provera | Rezultat |
| --- | --- |
| Targetirani PayPal/DB testovi | **PASS — 17/17** |
| Disposable PostgreSQL suite | **PASS — 3/3** |
| Cela Webshop test suite | **PASS — 165/165** |
| TypeScript typecheck | **PASS** |
| `npm run build:local` | **PASS** |
| `npm run release:check:local` | **PASS** |
| `npm run release:reproducible:local` | **PASS** |
| Webshop source worktree posle commita | **CLEAN** |

Novi provider testovi eksplicitno pokrivaju create/capture/refund request ID,
approved/pending/completed/failed događaje, refund stanja, dispute mapiranje,
missing/bad verification, unknown event, host allowliste, return-token binding
i PII redakciju. PostgreSQL test dokazuje return/webhook same-capture deduplikaciju,
amount/currency mismatch i partial/full refund agregate.

## 5. PP-01 do PP-18 matrica

Oznake: `PASS-LOCAL` je fixture/contract/DB dokaz; `BLOCKED-EXTERNAL` znači da
obavezni stvarni PayPal Sandbox dokaz nije izvršen. Lokalni PASS nije zamena za
provider-real PASS.

| ID | Lokalni dokaz | Provider-real stanje | Zaključak |
| --- | --- | --- | --- |
| PP-01 | Create order, sandbox host i stabilan request ID: PASS-LOCAL | OAuth/order nisu pozvani sa pravim Sandbox credentialom | BLOCKED-EXTERNAL |
| PP-02 | Completed direct-capture V2 contract i issuance gate: PASS-LOCAL | Nema Sandbox buyer approval/browser capture-a | BLOCKED-EXTERNAL |
| PP-03 | Signed-event verification contract i same-capture dedupe: PASS-LOCAL | Nema stvarnog signed Sandbox webhook-a | BLOCKED-EXTERNAL |
| PP-04 | Return pa webhook isti capture: PASS-LOCAL u PostgreSQL-u | Obrnuti provider-real redosled nije izvršen | PARTIAL / NO-GO |
| PP-05 | Pending/approved bez issuance-a: PASS-LOCAL | Buyer cancel nije izvršen u Sandbox browseru | BLOCKED-EXTERNAL |
| PP-06 | Approval URL allowlist i durable token binding: PASS-LOCAL | Prekid/resume istog Sandbox ordera nije izvršen | BLOCKED-EXTERNAL |
| PP-07 | Duplicate capture/event dedupe: PASS-LOCAL | Sandbox webhook resend nije izvršen | BLOCKED-EXTERNAL |
| PP-08 | Stable capture request ID i response-loss ugovor: PASS-LOCAL | Kontrolisan stvarni Sandbox retry nije izvršen | PARTIAL / NO-GO |
| PP-09 | Missing/malformed verification headeri: PASS-LOCAL | Nije potreban realan payment za fixture granu | PASS-LOCAL |
| PP-10 | Verification status različit od `SUCCESS`: PASS-LOCAL | Nije potreban realan payment za fixture granu | PASS-LOCAL |
| PP-11 | Forged/mismatched return token odbijen pre capture-a: PASS-LOCAL | Browser route nije izvršen na deployovanom RC-u | PARTIAL / NO-GO |
| PP-12 | Amount/currency/order mismatch fail-closed: PASS-LOCAL/DB | Nije izvršena provider-real negativna grana | PASS-LOCAL |
| PP-13 | Approved/pending/denied/failed/unknown bez licence: PASS-LOCAL | Podržani Sandbox negative test nije izvršen | PARTIAL / NO-GO |
| PP-14 | Full refund V2/lifecycle ugovor: PASS-LOCAL/DB | Nema stvarnog Sandbox refund API-ja/webhook-a | BLOCKED-EXTERNAL |
| PP-15 | Partial refund aggregate: PASS-LOCAL/DB | Nema stvarnog Sandbox partial refund-a | PARTIAL / NO-GO |
| PP-16 | Stabilan refund request ID i adjustment dedupe ugovor: PASS-LOCAL | Sandbox retry/response-loss nije izvršen | PARTIAL / NO-GO |
| PP-17 | Zvanični-shape dispute fixture open/won/lost: PASS-LOCAL | Real Sandbox dispute nije izvršen/dostupnost nije potvrđena | **PRODUCTION NO-GO** |
| PP-18 | Safe-metadata allowlista i test scan: PASS-LOCAL | Log/APM/DB scan stvarnog Sandbox prolaza ne postoji | PARTIAL / NO-GO |

## 6. Bezbednosni rezultat

- U ovom evidence-u nema client secret-a, OAuth access tokena, Sandbox lozinke,
  approval URL/tokena, raw webhooka, payer e-maila/adrese ili raw licence.
- Provera vendor env-a je urađena samo kao `present/missing`, bez ispisa
  vrednosti.
- Mode/API/approval/certificate host pravila su fail-closed i pokrivena testom.
- Provider payload nije sačuvan u `rawSafeMetadata`; čuva se samo strogo
  allowlistovana operativna evidencija bez payer/payee PII-ja.

## 7. Tačan blocker i sledeći bezbedan korak

U `D:\nr_cms-vendor\.env` potvrđen je `WEBSHOP_PAYMENTS_MODE=test`, ali nedostaju:

- `WEBSHOP_PAYPAL_CLIENT_ID`;
- `WEBSHOP_PAYPAL_CLIENT_SECRET`;
- `WEBSHOP_PAYPAL_WEBHOOK_ID`.

Za nastavak su potrebni i zaseban Sandbox Business seller, Sandbox Personal
buyer i javni HTTPS ingress koji izlaže samo:

```text
POST /api/webshop/payments/webhooks/paypal
```

Operator credentiale unosi direktno u lokalni test secret store/env i ne šalje
ih kroz chat. Posle toga, uz eksplicitno odobrenje, redosled je:

1. push/CI verifikacija commita;
2. publish paketa `0.6.25`, Master import/publish i disposable target redeploy;
3. ručni Sandbox buyer login/approval;
4. PP-01..PP-18 provider-real prolaz, refund i redigovan evidence scan;
5. gašenje privremenog ingress-a i konačna Sandbox GO/NO-GO odluka.

Dok ove stavke nisu završene, autoritativni status ostaje:
**PAYPAL SANDBOX E2E NOT PROVEN / PAYPAL LIVE NO-GO**.
