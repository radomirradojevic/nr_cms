# Prompt 13 — Security hardening, observability i recovery evidence

Datum završnog pregleda: **2026-08-20**

Restore drill završen: **2026-08-20T12:00:15.195Z**

Opseg: CMS host, packed License Server add-on, Webshop remote connector i
centralni License Server dependency tree.

## 1. Ishod

SEC-02..05 i OPS-01..05 imaju zelen code/contract/isolated-DB dokaz. Nema
poznatog otvorenog critical/high nalaza u pregledanom source-u, dependency
stablima, log/error površini ili release paketu. Production publish, live egress
probe i spajanje alarma na stvarni on-call sistem nisu izvršeni ovim lokalnim
promptom; ostaju eksplicitni deployment gate-ovi, a ne prećutani testovi.

Finalni packed License Server identitet:

- release artifact SHA-256:
  `63c43133d386e2c2a5394ecbbdfe119c6b51f0082a656f0f6d490237e08c026f`;
- verifikacioni tarball SHA-256:
  `67c9a06ec900666206696bd7ced10342df12b721d856a6ae14e2859b1d744ed0`;
- clean frozen host: Next.js `16.3.0`, tarball self-reference, RSC/route import i
  svih 16 admin/API/verifier render putanja zeleni.

## 2. Threat model i kontrole

[Security threat model](./security-threat-model.md) beleži trust granice, imovinu,
napadače i abuse-case matricu. Kontrole koje su dodate ili pooštrene:

- versioned `A256GCM` secret envelope `v:2` vezuje ciphertext za `kid` kroz AAD
  i prihvata samo kanonski kodirane ključeve, IV, tag i ciphertext;
  bounded keyring čita aktivni i odobrene stare ključeve, dok novi upis koristi
  samo aktivni KID;
- signing private keys, current/previous HMAC secret-i, encrypted license key i
  admin reveal payload prolaze kroz isti audited, bounded `FOR UPDATE SKIP
LOCKED` rewrap tok;
- production konfiguracija nema development encryption/runtime-hash fallback i
  fail-uje bez eksplicitnog 32-byte ključa ili keyring+active-KID ugovora;
- public, HMAC, activation/runtime, reveal i admin mutation granice koriste
  PostgreSQL fixed-window limiter sa DB vremenom. Test učitava dve nezavisne
  runtime instance i potvrđuje da 64 paralelna zahteva dele budžet 17;
- forwarded client adresa se ne veruje dok operator ne podesi tačan broj trusted
  proxy hop-ova; javne greške ostaju generičke i ne potvrđuju postojanje licence,
  klijenta ili reveal artefakta;
- Webshop remote konektor koristi direktan DNS-pinned Undici Agent, TLS najmanje
  1.2, CA proveru, manual redirect i bounded response. Private/mapped IP,
  rebinding i forwarding/proxy/host/length/cookie header-i se odbijaju;
- centralni audit sanitizer i structured logger ograničavaju dubinu/veličinu i
  rediguju tajne, JWT/bearer/private-key/licence oblike i nepotreban e-mail/PII;
- correlation ID prati HTTP, scheduler i admin tok, a packed Operational Health
  prikazuje queue/issue/validate/auth/key/catalog/lifecycle metrike i stabilne
  alarm kodove.

## 3. Backup/restore dokaz

Customer issuer backup format je podignut na `v:3`. AAD-bound manifest sadrži
format, algoritam, datum, `issuerRef`, keyset verziju i wrapping-key verziju;
zasebni SHA-256 checksum-i štite manifest i ciphertext pre dekripcije. Restore
zadržava kompatibilni reader za prethodni `v:2`, ali novi export uvek piše `v:3`.

Reproducibilna komanda iz add-on direktorijuma:

```text
npm run test:recovery:db:local
```

Datirani drill je prošao sledeće provere:

```json
{
  "drill": "license-server-customer-issuer-restore-v3",
  "completedAt": "2026-08-20T12:00:15.195Z",
  "outcome": "passed",
  "checks": [
    "backup_v3_manifest_and_ciphertext_checksums",
    "wrong_wrapping_key_rejected",
    "issuer_ref_preserved",
    "historical_assertion_valid_after_restore",
    "master_outage_does_not_block_customer_runtime"
  ]
}
```

Drill koristi izolovanu test bazu, proverava da pogrešan wrapping ključ fail-uje,
vraća isti `issuerRef`, verifikuje assertion izdat pre backup-a i dokazuje da
customer issuer/verifier ne pozivaju Master. Stvarni production wrapping ključ
nije korišćen niti zapisan u evidence.

## 4. Observability i incident response

Packed dashboard računa bounded snapshot iz operations, validation, audit,
signing-key i scheduler-lease stanja. Alarmira nedostupan aktivni ključ,
dead-letter, star pending queue/lease, auth/catalog/validation skok i prikazuje
poslednji correlation ID bez plaintext metadata-e. Vercel production deklaracija
poziva auth-ovan scheduler svakog minuta; route podržava provider `GET` i
operator/test `POST` kroz istu `CRON_SECRET` proveru.

[Incident runbook](./incident-response-runbook.md) sadrži stop/dijagnostika/
oporavak/verifikacija korake za:

- Master outage;
- customer issuer outage;
- izgubljen wrapping ključ;
- kompromitovan signing ključ;
- kompromitovan HMAC secret;
- nekonzistentan receipt.

Runbook eksplicitno zabranjuje tihi novi `issuerRef`, ponovno issue-ovanje posle
timeout-a i ponovno korišćenje kompromitovanog secret-a. Threat-model/runbook
contract test proverava prisustvo svake obavezne incident klase.

## 5. Završna test matrica

| Komanda / gate                               | Rezultat                                              |
| -------------------------------------------- | ----------------------------------------------------- |
| License Server `npm run typecheck`           | zelen                                                 |
| License Server `npm run test:db:local`       | **102/102**, 0 fail/skip                              |
| License Server recovery drill                | **1/1**, datirani JSON dokaz iznad                    |
| Packed Next 16.3 + PostgreSQL install/render | zelen, finalni digest-i iz odeljka 1                  |
| Webshop `npm run typecheck`                  | zelen                                                 |
| Webshop kompletan test suite                 | **193/193**, 0 fail                                   |
| CMS `npm run typecheck`                      | zelen                                                 |
| CMS `npm run test`                           | **372 pass**, 10 eksplicitnih DB/staging skip, 0 fail |
| CMS lokalni `npm run build`                  | fail-closed pre Next faze: nema worker credential-a   |
| Cron/env/logger/outbound fokusirani test     | **22/22**, 0 fail                                     |
| `npm run acceptance:redaction`               | **25/25**, 0 fail                                     |

Deset root skip-ova su postojeći opt-in DB/staging lifecycle scenariji; Prompt 13
DB, recovery, packed-host i security scenariji nisu preskočeni.

## 6. Dependency, supply-chain, secret i PII nalazi

| Provera                                | Rezultat / postupak                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm audit --audit-level=high` — CMS   | 0 vulnerabilities                                                                  |
| isto — License Server add-on           | 0 vulnerabilities                                                                  |
| isto — Webshop add-on                  | 0 vulnerabilities                                                                  |
| isto — centralni License Server        | 0 vulnerabilities                                                                  |
| supply-chain allowlist/integrity audit | prolazi; 0 non-registry tarball-a i 0 resolved registry tarball-a bez integrity-ja |
| secret/log/PII redaction acceptance    | 25/25; nema sentinel/secret/PII curenja                                            |

Tokom pregleda supply-chain auditor je prvo prijavio policy drift: tačno lokalno
`@nr-cms/addon-sdk` workspace povezivanje i pinovani `esbuild@0.28.2` install
script nisu imali dovoljno preciznu politiku. Popravka nije proširila generički
`file:` ili install-script allowlist: proverava se tačan workspace path,
package/version/private identitet, a dopušten je samo tačan esbuild paket/verzija.

Jedini preostali warning je šest transitive optional Tailwind WASI lockfile
zapisa u centralnom License Server-u (`@emnapi/core`, `@emnapi/runtime`,
`@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, `tslib`) koji
nemaju `resolved/integrity` metadata-u. Auditor ih ne računa kao resolved
registry tarball bez integriteta; `npm audit` je čist i nema critical/high nalaza.
Warning ostaje dokumentovan za sledeći upstream lockfile refresh.

## 7. Acceptance mapa

| ID     | Status                                     | Dokaz                                                                                                                                                                                    |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-02 | **zelen**                                  | Timing-safe HMAC, timestamp/nonce/scope/replay i bounded dual-secret rotacija ostaju zeleni; oba secret-a sada koriste versioned envelope/rewrap.                                        |
| SEC-03 | **zelen za code/DB multi-process granicu** | Sve tražene površine koriste persistent limiter; dve nezavisne instance dele jedan atomic DB budžet. Production capacity/SLO load ostaje rollout gate.                                   |
| SEC-04 | **zelen za code/contract granicu**         | TLS/CA/direct-agent, proxy/header, redirect, DNS pin/rebinding i private/mapped-IP testovi prolaze. Live production egress probe ostaje rollout gate.                                    |
| SEC-05 | **zelen**                                  | Centralni audit/log sanitizer, safe errors/correlation, no-store reveal/download i 25/25 secret/PII scan.                                                                                |
| OPS-01 | **zelen za deploy config/DB tok**          | Produkcioni cron deklaracija, authenticated GET/POST, singleton lease, retry/backoff/dead-letter/admin replay i restart testovi prolaze. Live scheduler observation ostaje rollout gate. |
| OPS-02 | **zelen za packed app signal/alert tok**   | Sedam kategorija metrike, stable alarm code i correlation ID su testirani/renderovani. Povezivanje na spoljašnji pager ostaje operator deployment obaveza.                               |
| OPS-03 | **zelen**                                  | Datirani, reproducibilni v3 restore drill čuva issuerRef i validira stari assertion.                                                                                                     |
| OPS-04 | **zelen za fault-E2E granicu**             | Master-outage scenario prolazi bez customer runtime Master poziva; cached entitlement pravila ostaju bounded/fail-closed.                                                                |
| OPS-05 | **zelen**                                  | Versioned incident runbook i contract test pokrivaju lost/compromised key, HMAC, issuer/Master outage i receipt inconsistency.                                                           |

## 8. Preostali production gate-ovi

Pre javnog GO operator još mora da postavi realni keyring u managed secret store,
zadrži stare KID-eve do zero-count rewrap potvrde, konfiguriše tačan trusted proxy
hop count, unese postojeće deployment-worker URL/auth i result-auth credential-e,
poveže alarm kodove sa on-call sistemom i izvrši live scheduler/egress smoke u
ciljnoj produkcionoj mreži. Clean packed Next 16.3 build/render je zelen; root
build nije zaobišao env guard. Ove stavke ne menjaju lokalni poslovni ishod, ali
release ne treba proglasiti operativno spremnim bez njihovog evidence-a.
