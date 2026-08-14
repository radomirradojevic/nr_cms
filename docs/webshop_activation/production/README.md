# Webshop produkcija — tehnički runbook

Ovaj podfolder opisuje šta još mora da se implementira, provisionuje, dokaže i
odobri pre produkcijske prodaje Webshop licenci i live naplate.

Polazna tačka je [Prompt 18 lokalni E2E dokaz](../19-prompt18-e2e-evidence-2026-08-13.md):
Webshop `0.6.24`, Master, CMS i deployment worker prošli su kompletan lokalni
`.nr.test` tok sa Stripe test mode-om. To je razvojni PASS zajedničkog
payment/issuance toka, a ne PayPal E2E ili produkcijska dozvola. PayPal ima
zaseban [Sandbox runbook](../20-paypal-sandbox-e2e-runbook.md) i mora dobiti
sopstveni dokaz pre Live canary-ja.

## Dokumenti i redosled

1. [00 — Preostali production gapovi i odluke](./00-production-gaps-and-decisions.md)
2. [01 — Topologija, javni domeni, DNS i TLS](./01-topology-domains-dns-tls.md)
3. [02 — Tajne, ključevi, KID-evi i rotacija](./02-secrets-keys-and-rotation.md)
4. [03 — Stripe live i produkcijska e-mail isporuka](./03-stripe-live-and-email.md)
5. [07 — PayPal Sandbox, live nalog i produkcijski acceptance](./07-paypal-sandbox-and-live.md)
6. [04 — Deployment worker, baze, backup i observability](./04-worker-data-backup-observability.md)
7. [05 — Staging, canary, produkcijski E2E i rollout](./05-staging-canary-and-rollout.md)
8. [06 — Env matrica i završna GO/NO-GO lista](./06-env-matrix-and-go-live-checklist.md)

Redosled je obavezan. Dokument 07 se izvršava paralelno sa payment delom
dokumenata 03/05/06 kada je PayPal izabrani provider. Ne postavljati
`WEBSHOP_PAYMENTS_MODE=live` dok topologija, worker, ključni materijal, zasebni
acceptance izabranog providera, webhook, e-mail reconciliation, backup i
alerting gate-ovi nisu zeleni.

## Šta je dokument, a šta izvršenje

Ovaj runbook:

- navodi tačne postojeće konfiguracione ugovore i rute;
- označava preostale code gapove koji se ne mogu rešiti samo env promenom;
- definiše evidence koji operator mora sačuvati;
- daje bezbedan redosled staging/canary/production koraka.

Ovaj runbook nije odobrenje za:

- pravljenje ili menjanje DNS/TLS zapisa;
- kreiranje Stripe ili PayPal live aplikacije/webhook credentiala;
- unos production tajni;
- migraciju ili restore baze;
- package/Master release publish;
- aktiviranje live checkout-a;
- produkcijski deployment.

Svaka navedena spoljašnja mutacija zahteva eksplicitnu operatorsku odluku u
trenutku izvršenja.

## Status oznake

- **DONE-LOCAL** — dokazano u Prompt 18 lokalnom E2E-u;
- **CODE-GAP** — potrebna je implementacija i regression test;
- **OPERATOR** — konfiguracija/provisioning van Git repozitorijuma;
- **EXTERNAL** — promena u DNS, payment provideru, e-mail, cloud ili hosting sistemu;
- **EVIDENCE** — dokaz koji mora biti sačuvan;
- **NO-GO** — produkcija se ne uključuje dok stavka nije zatvorena.

## Glavno sigurnosno pravilo

Nikada ne kopirati stvarne vrednosti tajni, license key, payment podatke ili
customer PII u ovaj direktorijum, Git, ticket, shell history, screenshot ili
release evidence. Dokumentuju se samo naziv secret reference-a, KID, vlasnik,
rok, hash javnog artefakta i rezultat provere.

## Autoritativni izvori

Ako se implementacija promeni, runbook se mora uskladiti sa:

- root `scripts/validate-runtime-env.mjs` i `.env.example*`;
- Webshop payment/delivery provider kodom i release ugovorom;
- Master `src/lib/security-config.ts`, `.env.example` i release katalogom;
- worker `src/config.ts`, `src/targets/static-config.ts` i secret resolverima;
- [bezbednosnim i rollback ugovorom](../10-security-operations-i-rollback.md);
- [solo release authority runbook-om](../15-solo-maintainer-release-authority.md);
- [Master release catalog runbook-om](../16-master-release-catalog-operator-runbook.md).

`docs/webshop_activation/production` je operativni sažetak za produkciju; ne
menja kriptografske i state-machine ugovore iz navedenih autoritativnih dokumenata.
