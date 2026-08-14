# 00 — Preostali production gapovi i odluke

## 1. Trenutno dokazano stanje

**DONE-LOCAL:**

- Webshop source `df5a6938...`, tag/package `0.6.24`;
- objavljen GitHub Package i published Master release;
- vendor i client instalacije završile `ready` kroz pravi hosted-package worker;
- Stripe test payment `WEB-1008` završio `paid/completed/fulfilled`;
- izdat je tačno jedan entitlement i client je njime aktiviran;
- payment duplicate/response-loss/refund/dispute, worker crash/fencing/DLQ,
  backup/restore i rollback fixture-i su zeleni;
- PayPal P0 adapter hardening je lokalno završen na Webshop `0.6.25`, commit
  `95002515...`; 165/165 testova, PostgreSQL integracije, build, pack i
  reproducibility su zeleni;
- runtime targeti ne sadrže `.private` i koriste hosted paket iz `node_modules`.

Ovaj dokaz koristi `.nr.test`, lokalni CA, development licence, test KID-eve,
Stripe sandbox i lokalne Windows servise. Nije prenosiv na produkciju samo
promenom URL-a. PayPal P0 kod je dokazan lokalno, ali realan PayPal Sandbox
order/capture/signed-webhook/refund E2E još nije dokazan. Autoritativan parcijalni
dokaz je [Prompt 19 evidence](../22-prompt19-paypal-sandbox-evidence-2026-08-14.md).

## 2. Blockeri iz Prompt 18 evidence-a

| ID | Preostala stavka | Vrsta | Zatvoreno kada |
| --- | --- | --- | --- |
| P-01 | Javni domeni, DNS, TLS i HTTPS well-known domain proof | EXTERNAL + EVIDENCE | Master sa produkcijske mreže verifikuje public-only DNS i validan proof bez development izuzetka. |
| P-02A | Izbor najmanje jednog produkcijskog payment providera | ADR + OPERATOR | Dokumentovan je provider, pravno lice/država, valute, naknade, refund/dispute/payout owner-i i fallback/kill-switch politika. |
| P-02B | PayPal realan Sandbox E2E, ako se PayPal koristi; P0 code hardening je PASS-LOCAL | EXTERNAL + EVIDENCE | [PayPal Sandbox matrica](../20-paypal-sandbox-e2e-runbook.md) prolazi sa stvarnim capture-om, signed webhook-om, jednim entitlementom i refundom. |
| P-02C | Live account/credential/webhook acceptance izabranog providera | EXTERNAL + OPERATOR | Verifikovan Business nalog, kontrolisana live uplata, signed webhook, issue, reveal i refund prođu jednom; Stripe i PayPal imaju odvojene gate-ove. |
| P-03 | Production signing/HMAC/encryption keyseti i rotacija | OPERATOR + EVIDENCE | Nema local/test KID-a; active/old/revoked matrica i restore/rotation drill su dokazani. |
| P-04 | Production worker credential/deployment adapter | CODE-GAP + OPERATOR | Worker više nije vezan za test URL/DB/servise i izabrani hosting adapter prođe packed release deploy/rollback. |
| P-05 | Backup/restore, alerting i threat-model na stvarnoj infrastrukturi | CODE-GAP + OPERATOR | Restore zadržava identitete/fencing, alarmi rade i threat-model nalazi su zatvoreni. |
| P-06 | Produkcijski e-mail provider i reconciliation | OPERATOR + EVIDENCE | Provider `send` i autoritativni `retrieve(providerMessageKey)` rade bez duplog maila ili ključa u poruci. |
| P-07 | Završni staging/canary/production smoke | OPERATOR + EVIDENCE | Svi gate-ovi iz dokumenta 06 imaju dokaz i eksplicitni GO. |

## 3. Dodatni code gapovi potvrđeni auditom

### 3.1 Deployment worker je test-specifičan — NO-GO

Trenutni `.private/addon-deployment-worker` nije opšti production worker:

- `src/config.ts` zahteva hostname `deploy.nr.test` bez porta/path-a;
- zahteva bazu tačno `/nr_addon_deployment_worker_test`;
- `src/targets/static-config.ts` zahteva tačno dva targeta: `vendor` i `client`;
- DB nazivi su zaključani na `nr_cms_vendor_test` i `nr_cms_client_test`;
- servisi su zaključani na `NRVendorCms`/`NRClientCms`, WinSW i portove 3000/3002;
- release root mora početi `D:\nr_deploy\vendor|client`;
- worker HMAC secret resolver prepoznaje samo dve lokalne target putanje;
- toolchain i Windows service SID vrednosti su hard-pinovane za lokalni profil.

Promena env fajla ovo ne rešava. Pre produkcije treba implementirati
verzionisani production target policy i odgovarajući deployment adapter.

### 3.2 Hosting model nije usklađen — NO-GO

`.env.example.vendor` trenutno kaže `WEBSHOP_DEPLOYMENT_MODE=vercel`, dok worker
može da menja samo lokalni Windows SCM/WinSW target. Pre implementacije mora biti
izabrana jedna od opcija:

1. vendor/customer Webshop produkcija je ograničena na podržani self-hosted
   Windows adapter; ili
2. implementira se poseban Vercel production adapter sa provider attestation,
   immutable build/release, migration i rollback ugovorom; ili
3. različiti targeti koriste eksplicitno verzionisane adaptere, bez fallback-a
   na arbitrary command/PID/file-copy.

Preporučeni početni proizvodni scope je mali i eksplicitan: jedan dokazani
platformski adapter, pa tek zatim novi provider-i.

### 3.3 Production e-mail fail-closed provera nedostaje — NO-GO

Webshop već ima Resend adapter sa:

- `Idempotency-Key=providerMessageKey`;
- hashovanim provider tagom;
- list/detail retrieval reconciliation;
- bounded page limitom.

Međutim, root env validator i dalje prihvata
`WEBSHOP_DELIVERY_EMAIL_PROVIDER=fixture` i kada je
`NR_LICENSE_ENVIRONMENT=production`. Produkcijski startup mora odbiti `fixture`,
a packaged release test mora dokazati tu zabranu.

### 3.4 Observability sink nije zaokružen — NO-GO

Core/Webshop trenutno pišu strukturisane redigovane JSON događaje na
`console.*`, a worker ima health endpoint. To nije kompletna APM/metrics/alert
integracija. Potrebni su log collector, retention/redaction kontrola, metrike,
dashboard-i i provereni alarmi iz dokumenta 04.

### 3.5 Env šabloni još predstavljaju pre-live stanje

`.env.example.vendor` namerno ima:

- `WEBSHOP_PAYMENTS_MODE=test`;
- `WEBSHOP_DELIVERY_EMAIL_PROVIDER=fixture`;
- lokalni/test komentare za deployment worker;
- Vercel deployment mode koji nije pokriven trenutnim worker adapterom.

Produkcijski šablon ne menjati pre nego što prethodni code gapovi dobiju testove;
zatim napraviti zaseban `.env.example.production.*` ili jasno verzionisan
provisioning manifest, bez secret vrednosti.

## 4. Obavezne arhitektonske odluke

Pre prvog production change seta zapisati ADR sa odgovorima:

1. Gde fizički rade `nrcms.com` vendor CMS, `ls.nrcms.com` Master i deployment
   worker?
2. Koji customer hosting je podržan u prvoj produkcijskoj verziji?
3. Ko izvršava migracije za svaki target i kojim najmanje privilegovanim
   identitetom?
4. Kako deployment adapter atomarno menja release i dokazuje health/rollback?
5. Da li worker ima target po instalaciji ili poseban worker po customer trust
   zoni?
6. Koji secrets sistem se koristi: Vercel encrypted env, cloud KMS/secret
   manager, Windows DPAPI service-SID ili kombinacija?
7. Ko je vlasnik svakog signing/HMAC/encryption ključa i njegovog incidenta?
8. Koji log/APM/metrics/alert i backup sistemi su autoritativni?
9. Koji su SLO, RPO i RTO?
10. Koji realan e-mail domen/provider i Stripe legal entity primaju produkcijski
    saobraćaj, ili je PayPal izabran kao prvi live provider i koji verifikovani
    PayPal Business nalog/pravni subjekt ga poseduje?

ADR mora navesti i odbijene alternative, jer one određuju rollback i operativne
obaveze.

## 5. Implementacioni redosled

1. Zaključati topologiju i podržani deployment adapter.
2. Implementirati production worker/adapter i fail-closed env validaciju.
3. Provisionovati staging javne domene, TLS i baze.
4. Provisionovati production key hierarchy i testirati rotaciju/restore u staging-u.
5. Povezati Stripe test webhook i/ili PayPal Sandbox webhook na javni staging;
   izabrani provider mora imati sopstveni E2E dokaz. Povezati i Resend
   sandbox/verified domen.
6. Povezati log/APM/metrics/alert i backup sisteme.
7. Ponoviti pun Prompt 18 tok na staging infrastrukturi sa izabranim providerom;
   PayPal zahteva i zaseban Prompt 19 Sandbox evidence.
8. Provisionovati production resurse bez uključivanja checkout-a.
9. Deployovati dark/canary sa storefront/checkout kontrolama zatvorenim.
10. Izvršiti kontrolisani live payment/reveal/refund smoke za tačno jedan
    odobren provider; drugi provider ostaje isključen dok ne prođe isti gate.
11. Eksplicitno odobriti širi rollout.

## 6. Šta nije preostali Prompt 18 bug

- GitHub Release može ostati draft evidence carrier po postojećem solo-authority
  ugovoru; npm package i Master release su već odvojeni autoriteti.
- `entitlementToken` dual read/write je namerno zadržan za rollback/backup
  retention. Uklanja se kasnije tek uz dokaz nula zavisnosti.
- Novi License Server add-on projekat iz `docs/license-server-addon` je odvojen od
  ovog Webshop production rollout-a.

## 7. Minimalni evidence paket

Za svaki staging/production pokušaj sačuvati bez tajni:

- datum, operatora, environment i odobrenje;
- commitove sva četiri source repoa;
- Webshop package version/tag/digest, publication attestation i Master release ID;
- DNS/TLS/proof rezultate;
- KID/keyset hash-eve i rotation/restore rezultate;
- migration/backup ID-eve i DB role dokaz;
- worker target policy hash, job/operation/epoch/generation i terminal receipt;
- provider/app/webhook/order/session/capture/event/refund reference bez payment
  credentiala, buyer PII-ja ili kartičnih podataka;
- order/entitlement ID bez raw ključa;
- email provider message ID/hashovani provider key i reconciliation rezultat;
- alert/smoke/rollback rezultate;
- preostale NO-GO stavke.
