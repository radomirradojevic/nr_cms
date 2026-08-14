# Prompt 19 — PayPal Sandbox E2E evidence, 2026-08-14

## 1. Rezultat

**PAYPAL P0 CODE GATE: PASS (LOCAL)**  
**PAYPAL REAL-SANDBOX PAYMENT + LICENSE ISSUANCE: PASS**
**PAYPAL REFUND/DISPUTE I PRODUKCIJA: IN PROGRESS / NO-GO**
**PAYPAL LIVE I PRODUKCIJA: NO-GO**

Lokalni PayPal V2 adapter, reducer ugovori i bezbednosne provere su završeni,
a stvarni PayPal Sandbox order/capture/signed-webhook tok je izvršen do
autoritativnog `paid` stanja. Prvi provider-real nalog `WEB-1010` nije lažno
proglašen happy-path PASS-om: seller je ručno prihvatio pending uplatu nakon
isteka Master payment-authorization prozora, pa je izdavanje licence ispravno
zaustavljeno sa `issuance_security_review`. Dva naredna naloga, `WEB-1011` i
`WEB-1012`, završena su u važećem autorizacionom prozoru: oba su plaćena, oba
su izdala tačno jednu licencu, Master stanje je `active/resolved_active`, a obe
secure-delivery poruke su prihvaćene od e-mail provajdera. Disposable customer
aktivacija je stigla do uspešne Master verifikacije, ali je otkrila zaseban CMS
profilni bug opisan u odeljku 2.3; zbog toga customer `ready` još nije PASS.

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

Tabela iznad ostaje istorijski P0 kandidat. Provider-real prolaz je zatim
izveo korektivne release-ove zaključno sa sledećim autoritativnim tuple-om:

| Polje | Vrednost |
| --- | --- |
| Webshop source commit | `e8bf1662d623b23fd9b163bf702316f2d9102813` |
| Package | `@radomirradojevic/webshop@0.6.28` |
| Release ID | `746921ed-63ce-5797-bdd3-fccb3f73f369` |
| Artifact SHA-256 | `1c9de81b6c28d35b0e931f98fb2f38d38f4a4c167b62f30c3cd17d2f17bfd9e8` |
| Dependency lock SHA-256 | `7af4dfd7e117a1a48e84b9cde1b3ec3ecc49cca28b60ade576d15ee535679c27` |
| Migration bundle SHA-256 | `2c3237a859c4679f7d41a17cb7b30cb2846bb07fd6d5f744f952be65c190f2a2` |
| npm tarball SHA-256 | `a97198f0131e302c41c932493ae09175955f44dd9a253672dc5bc05fbc022faf` |
| Publication attestation SHA-256 | `f85633eeda63e1d23f9e9af4340fce105ce3a004947b332ce0cc63870e3100a8` |
| Registry package version ID | `1133048726` |

Release `0.6.28` je objavljen, importovan/publikovan u Master i redeployovan na
vendor. Deployment job `90766c9d…` završio je kao `callback_acked`, vendor
control plane je `ready`, desired/installed tuple je identičan, jedini serving
fence je `resolved_success`, a javni vendor storefront vraća HTTP 200.

Korekcija u `0.6.28` rešava PayPal return origin iza reverse proxy-ja: finalni
redirect koristi konfigurisani javni base URL umesto internog
`https://localhost:3000` origin-a. Cela Webshop suite je **PASS — 166/166**,
typecheck je PASS i CI run `31800456439` je PASS.

Tokom redeploy-a otkriven je i ispravljen Node 24 ESM/CJS interop u CMS
deployment-outbox launcher-u. Ispravka je na `origin/master` kao commit
`29836ef`; lint, typecheck i bezmutaciona provera export resolution-a su PASS.

Konačni autoritativno objavljen i vendor-deployovan release je Webshop
`0.6.29`:

| Polje | Vrednost |
| --- | --- |
| Webshop source commit | `cef008fa33dfa83a4fc68e354fba20b35fcc44a0` |
| CMS source commit | `d4bf59dc7ecf20ed56f39850cc079322d9bca30b` |
| Package | `@radomirradojevic/webshop@0.6.29` |
| Release ID | `af059dab-26d8-5ea8-87c4-04cf6d0de771` |
| Artifact SHA-256 | `30c81fd736c15ebfa9c03f531cabeb584bdc50adbb7b0f389d7e00759c555439` |
| Dependency lock SHA-256 | `106e5a57fbde18037b298b9472dcd02dc383edf5d5d4cac36b3520286a72a7c2` |
| Migration bundle SHA-256 | `2c3237a859c4679f7d41a17cb7b30cb2846bb07fd6d5f744f952be65c190f2a2` |
| npm tarball SHA-256 | `8521c6444fd21c438f7622500f9641ad65f7e7061e75dcd23a832b88d149b3c4` |
| npm integrity | `sha512-0WNXRVb/K/M3SWgm/EjgCbxCXHz1mwIvsDsTOIBcyIfmJFDR0lT0ZQirMfd1CvZX+68XT/xtv3Iol5QwVXX6/g==` |
| Publication attestation SHA-256 | `8d0a3b356e0b3700ce50ad10b91aff155c76d02030ebd8b0b0bc73ecb2e1bad4` |
| Registry package version ID | `1133483463` |
| CI run | `31811384227` — PASS |

Kandidat `0.6.29` zabranjuje anonimnu kupovinu u UI, Server Actions i data
sloju. Katalog ostaje javno čitljiv, ali dodavanje u korpu, izmena korpe,
kuponi, checkout, kreiranje narudžbine i prikaz confirmation statusa zahtevaju
ulogovanog korisnika; confirmation token dodatno mora pripadati istom
`customer_user_id`. Guest-checkout kontrola je uklonjena iz administratorskog
UI-ja i novi podrazumevani settings ugovor je `false`.

Authority publish, Master import/publish i vendor managed redeploy su PASS.
Vendor worker job `6f323614-d7e4-4e75-b280-7632bb922f5d` završio je kao
`callback_acked`, sa `final_status=succeeded`, `final_phase=ready` i
`reconciliation_receipt` dokazom. Vendor desired/installed release, artifact
i verzija su identični, `runtime_status=ready`, nema aktivnog serving fence-a,
a javni storefront i proizvod vraćaju HTTP 200. Anonimni proizvod prikazuje
`Sign in to purchase` i ne nudi guest checkout.

## 2.1 Provider-real WEB-1010 dokaz

- PayPal Sandbox order je kreiran preko stvarnog Business/Personal para.
- `CHECKOUT.ORDER.APPROVED`/pending stanje nije izdalo licencu.
- Seller je prihvatio uplatu u Sandbox Business nalogu; PayPal je prikazao
  `Payment Accepted`.
- Signed completed-capture webhook je prihvaćen i isti payment je postao
  `paid`, sa tačno jednim capture evidence zapisom i tačno jednom license issue
  operacijom.
- Order `WEB-1010` je ostao `processing/unfulfilled`; license issue je ostao
  `pending`, a durable issue operacija je prešla u
  `issuance_security_review` zato što je Master `usedExpiresAt` bio istekao.
- Nije vršena ručna izmena baze niti zaobilaženje authorization/security gate-a.

Ovo je pozitivan dokaz za realni create/approval/pending/completed/signed
webhook i deduplikaciju, ali istovremeno negativan/bezbednosni dokaz da kasni
capture ne sme automatski izdati licencu. Nije happy-path fulfillment PASS.

## 2.2 Provider-real WEB-1011 i WEB-1012 dokaz

- Oba PayPal Sandbox plaćanja seller je prihvatio u važećem Master
  authorization prozoru.
- `WEB-1011` i `WEB-1012` su `paid`, svaki sa tačno jednim capture evidence
  zapisom i tačno jednom license issue operacijom.
- Obe centralne licence su `active`; post-issue reconciliation je za obe
  `resolved_active`.
- Fulfillment cron je izdao obe licence, a delivery cron je obe secure-delivery
  poruke preveo u `accepted`, sa po jednim pokušajem i provider message ID-em.
- Nije vršena ručna promena payment/order/license stanja u bazi.

`WEB-1011` je namenjen aktivaciji disposable customer instance. `WEB-1012`
ostaje kontrolni plaćeni nalog za završni full-refund i lifecycle test.

## 2.3 Disposable activation regresija i korekcija

Aktivacija isporučenom licencom na `paypal.nr.test` vratila je poruku
`Webshop license was verified, but durable installation state could not be
committed.` Master verifikacija je prošla, ali lokalne tabele
`cms_addon_installations`, `cms_addon_operations` i
`cms_addon_deployment_outbox` nisu dobile nijedan Webshop zapis.

Uzrok je precizno izolovan: `requiredDeploymentProfile()` je dozvoljavao samo
`vendor|client`, iako svi ostali deployment ugovori pravilno podržavaju
`vendor|client|paypal`. Allowlist je usklađen, validator je izdvojen u čistu
biblioteku, a izolovani PostgreSQL test sada potvrđuje da profil `paypal`
atomski upisuje durable installation/operation/outbox sa
`target_profile=paypal`. Test je PASS 8/8; root typecheck je PASS. Korekcija je
commitovana i pushovana kao CMS commit
`d4bf59dc7ecf20ed56f39850cc079322d9bca30b`. PayPal disposable core je zatim
redeployovan na immutable bootstrap
`8a75722b57ea46453c5dc03f58a2fcc66de882d25fe012dbe393b9f729ee93f4`;
`NRPaypalCms` je running, javni origin vraća HTTP 200, a dashboard ruta
fail-closed preusmerava neautentifikovan zahtev. Ponovni korisnički klik na
`Activate Webshop` ostaje poslednji korak za potvrdu disposable customer
`ready` stanja.

Tokom core redeploy-a operator je dopunjen da Windows PowerShell kompatibilno
menja target env i da verifikovani immutable managed release može biti
bezbedan predecessor addon-free core redeploy-a. Worker testovi su PASS 74/74
(5 DB testova je namerno skipovano izvan izolovane baze), lint i typecheck su
PASS. Lokalni worker commitovi su `7672adc` i `a81e7d3`; worker/broker runtime
je usklađen na `a81e7d3` i policy hash
`d2b286fad7704f5880f370329ffed01739b97f9e333e5c22cbb67dcbc9c7192f`.

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
| Cela Webshop 0.6.29 test suite | **PASS — 170/170** |
| TypeScript typecheck | **PASS** |
| `npm run build:local` | **PASS** |
| `npm run release:check:local` | **PASS** |
| `npm run release:reproducible:local` | **PASS** |
| Webshop 0.6.29 release check | **PASS** |
| Webshop 0.6.29 reproducibility | **PASS — exact artifact tuple** |
| CMS PayPal activation DB regresija | **PASS — 8/8** |
| CMS root TypeScript typecheck | **PASS** |

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
| PP-01 | Create order, sandbox host i stabilan request ID: PASS-LOCAL | Stvarni Sandbox OAuth/order i buyer approval izvršeni | PASS-PROVIDER-REAL |
| PP-02 | Completed direct-capture V2 contract i issuance gate: PASS-LOCAL | `WEB-1011` i `WEB-1012` završili paid + issued; `WEB-1010` kasni capture ostao na review gate-u | PASS-PROVIDER-REAL |
| PP-03 | Signed-event verification contract i same-capture dedupe: PASS-LOCAL | Stvarni signed completed-capture webhook prihvaćen | PASS-PROVIDER-REAL |
| PP-04 | Return pa webhook isti capture: PASS-LOCAL u PostgreSQL-u | Obrnuti provider-real redosled nije izvršen | PARTIAL / NO-GO |
| PP-05 | Pending/approved bez issuance-a: PASS-LOCAL | Stvarni pending/approved period nije izdao licencu; buyer cancel još nije izvršen | PARTIAL-PROVIDER-REAL |
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

Credentiali, webhook ID i javni ograničeni HTTPS ingress su provisionovani;
realni signed webhook, paid, issuance i secure delivery su dokazani. Release
`0.6.29`, Master import/publish, vendor redeploy i PayPal core redeploy su
završeni. Neposredni koraci su idempotentan korisnički retry aktivacije do
disposable customer `ready`, zatim full Sandbox refund naloga `WEB-1012`,
lifecycle reconciliation i redigovan log/DB scan. Real dispute ostaje poseban
production NO-GO ako PayPal Sandbox nalog ne omogući njegovo pokretanje.

Dok disposable `ready`, refund i završni scan nisu završeni, autoritativni
status ostaje: **PAYPAL SANDBOX E2E PARTIAL / PAYPAL LIVE NO-GO**.
