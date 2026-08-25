# License Server incident response runbook

Verzija: 1.1

Poslednji tabletop/restore drill: **2026-08-26**

## Pravila koja važe za svaki incident

1. Otvori incident ID i sačuvaj vreme, deployment/release digest, alarm code,
   correlation ID, operation ID i pogođeni issuerRef. Ne kopiraj secret, assertion,
   license key, customer e-mail ili raw request u tiket/chat/log.
2. Zaustavi samo pogođenu mutaciju/scope. Ne briši operation, receipt, audit,
   nonce, limiter ili key istoriju i ne popravljaj stanje direktnim SQL-om.
3. Timeout/unknown se poll-uje ili replay-uje sa istim operation/idempotency key-em.
   Nikada se ne izdaje nova licenca samo zato što odgovor nije stigao.
4. Pre rotacije izvezi proverljiv v3 backup, zabeleži wrapping-key verziju odvojeno
   u secrets sistemu i proveri checksum. Plaintext wrapping ključ nije evidence.
5. Posle oporavka izvrši ciljane testove, pregledaj Audit/Operational health i
   zabeleži ko je odobrio ponovno otvaranje toka.

## Brza trijaža

| Signal                                            | Prvi bezbedan potez                                                            | Zabranjeno                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `issuer_dead_letters_present`                     | otvori Operations, pronađi correlation ID i klasifikuj retryable/terminal      | novi manual issue za isti order item              |
| `issuer_queue_stalled` / `issuer_scheduler_stale` | proveri cron auth, poslednji lease i DB dostupnost; pokreni isti versioned job | paralelni ad-hoc worker bez lease-a               |
| `active_signing_key_count_invalid`                | zatvori issue/reveal i proveri Keys & Backup                                   | tiho kreiranje novog issuerRef-a                  |
| `authentication_rejection_spike`                  | rate-limit stanje, HMAC client/status/scope/nonce audit                        | otkrivanje da li konkretan client/license postoji |
| `catalog_failure_spike`                           | freeze publish/sync, proveri pinned issuerRef/revision/TLS                     | dozvola redirect-a ili private host-a             |

## Master outage

Detekcija: Master revalidation/install greške uz zdravu lokalnu DB i customer
issuer keyset.

1. Freeze samo install/new entitlement promene; postojeći customer runtime
   validate i verifier ostaju lokalni.
2. Potvrdi cached entitlement/grace stanje i `edit_existing_only` matricu.
3. Ne menjaj customer issuerRef, signing key, receipt ili operation state.
4. Kada se Master vrati, pokreni uobičajeni revalidate istog entitlement-a i
   pregledaj audit; ne radi reinstall ako digest nije promenjen.
5. Exit: Master response je verifikovan, admin mode je očekivan, postojeći stari
   assertion i lokalni validate i dalje prolaze.

## Customer issuer/API outage

1. Webshop fulfillment ostavi `pending/retry`; timeout je unknown i vodi na poll.
2. Proveri DB, scheduler lease, TLS/DNS/allowlist i active signing key alarm.
3. Popravi uzrok, zatim replay DLQ samo kroz permission-ovani admin action; koristi
   postojeći operation key i payload hash.
4. Delivery retry ne sme ponoviti fulfillment. Uporedi durable receipt hash i
   order-item pinned issuer/profile/schema/policy/mapping snapshot.
5. Exit: tačno jedan receipt/licenca po stavci, queue age ispod SLO-a i DLQ nula.

## Izgubljen backup wrapping ključ ili runtime envelope KEK

1. Odmah pauziraj signing, HMAC auth i reveal. Ne generiši novi issuer preko
   postojećeg identiteta i ne tvrdi da je backup obnovljiv bez wrapping ključa.
2. Inventariši odobrene secret-store/escrow verzije po KID-u bez prikaza vrednosti.
3. Ako je runtime KEK samo rotiran, vrati stari KID u bounded keyring, potvrdi read,
   dodaj novi active KID i ponavljaj **Rewrap secret envelopes** do zero-count-a.
4. Ako nijedan odobren ključ ne postoji, status je data-loss/security incident:
   očuvaj DB/audit, objavi recovery-required, planiraj kontrolisani novi issuer i
   customer reissue uz eksplicitnu odluku. Nema silent fallback-a.
5. Exit: v3 restore prolazi u izolovanoj bazi, issuerRef i istorijski assertion su
   potvrđeni ili je formalno odobren novi trust root i reissue plan.

## Kompromitovan signing ključ

1. Pauziraj issue i offline-file delivery; sačuvaj pogođeni KID i vremenski opseg.
2. Označi kompromitovani key revoked/izvan keyset-a prema incident odluci. Normalni
   verification overlap se ne primenjuje na kompromitovan ključ.
3. Kreiraj novi signing KID pod zdravim envelope KEK-om; objavi keyset revision i
   obori cache prema dokumentovanom incident mehanizmu.
4. Pronađi assertion-e potpisane pogođenim KID-om preko signing metadata-e, zahtevaj
   online revalidation i kontrolisani reissue/revoke.
5. Exit: novi issue koristi novi KID, kompromitovani KID nije trust anchor, audit i
   customer obaveštenja su kompletni.

## Kompromitovan HMAC client secret

1. Revoke pogođeni API client ili njegove issue/lifecycle scope-ove; rate limiter
   i nonce istoriju ostavi netaknute.
2. Pregledaj `telemetry.auth.*`, client scope, operation payload hash i correlation
   trag; identifikuj neovlašćene licence bez čitanja plaintext key-a.
3. Rotiraj credential. Dual-secret overlap je dozvoljen samo kada stari secret
   nije kompromitovan; u incidentu ga odmah povuci.
4. Revoke/suspend neovlašćene licence kroz lifecycle engine sa reason code-om.
5. Exit: stari credential je 401/403 generic, novi ima najmanji scope, nonce replay
   pada i nema neobrađenih sumnjivih operations.

## Nekonzistentan ili dupli receipt

1. Freeze pogođeni connection/profile i delivery; ne radi reveal niti novi issue.
2. Veži order item → pinned snapshot → operation key/payload hash → operation ID →
   receipt ID/hash → license ID. Razlika istog key-a i drugog hash-a je conflict,
   ne retry sa novim key-em.
3. Ako je issuer committed, obnovi lokalnu projekciju iz istog status/receipt
   odgovora. Ako nije committed, replay istog operation-a.
4. Dve različite licence za istu stavku su security incident: suspenduj obe dok
   ownership i autoritativni receipt nisu potvrđeni; zatim kontrolisano revoke-uj
   samo višak i dokumentuj customer delivery posledicu.
5. Exit: jedna aktivna licenca/receipt po stavci, receipt hash odgovara, delivery
   audit nema plaintext i reconciliation alarm je zatvoren.

## Oporavak neuspele početne managed instalacije

Ova procedura važi samo za početnu instalaciju koja je završila u
`maintenance_required`, bez dokaza da je neuspešna operacija ikada postavila
aktivan runtime. Ne koristi se za upgrade ili zaobilaženje rollback pravila.

1. Freeze-uj pogođenu instalaciju i sačuvaj originalni operation/job ID, epoch,
   generation, terminalni receipt hash i incident code. Ne menjaj status direktno
   u bazi i ne šalji isti dispatch ponovo.
2. Potvrdi da ne postoji installed evidence za neuspešnu operaciju, aktivan
   serving fence, candidate release ili druga aktivna deployment operacija.
   Postojeći receipt-proven runtime, ako postoji, mora ostati netaknut.
3. Otkloni uzrok i pribavi recovery receipt koji je vezan za tačno originalnu
   operaciju, job i evidence hash. Njegov outbox/callback mora biti potvrđen.
4. Ponovo proveri Master entitlement svežim V2 Proof-of-Possession zahtevom za
   tačan installation ID, environment i release. Stari token ili ručno unet
   entitlement nije dovoljan.
5. Kreiraj auditovanu clearance odluku sa clearance ID-em, vremenom, actor-om,
   razlogom, originalnim operation/job ID-em i recovery evidence-om. Recovery
   mora otvoriti novi deployment epoch sa `generation=1`; ne nastavlja stari
   epoch povećavanjem generation-a.
6. Exit: novi job ima sopstveni idempotency trag, terminalni receipt i potvrđen
   callback; junction, serving fence i installation evidence međusobno se slažu.

## Nepromenljivo CMS/release neslaganje

`release_expected_cms_commit_sha_mismatch` je trajno, pre-mutation odbijanje, a
ne prolazna build greška.

1. Uporedi samo javna polja: očekivani CMS commit iz source/policy zapisa sa CMS
   commit-om iz potpisanog package manifesta i publication attestation-a. Ne
   ispisuj registry credential, install token, activation token ili license key.
2. Worker završava operaciju kao `permanent` i `rejected_before_switch`; ne radi
   interne ili durable retry pokušaje za isti nepromenljivi input.
3. Potvrdi da nisu promenjeni DB schema, release pointer, junction, serving fence
   ili prethodni receipt-proven runtime. Ako su menjani, otvori poseban integrity
   incident umesto nastavka instalacije.
4. Zabranjeno je popuštanje exact-SHA verifiera, pin override, direktna izmena
   baze, nova aktivacija radi maskiranja greške ili ponovno slanje istog dispatcha.
5. Nastavak je dozvoljen tek sa zasebno odobrenim, potpisanim i objavljenim
   kompatibilnim release-om vezanim za izabrani CMS commit. Zatim se pokreće novi
   uobičajeni managed deployment lifecycle.
6. Exit: novi manifest, publication attestation i source/policy imaju isti CMS
   commit, a prethodni neuspešni job ostaje neizmenljiv audit dokaz.

## Reproducibilni restore drill

Iz `D:\nr_cms\.private\license-server-addon` pokrenuti:

```powershell
npm run test:recovery:db:local
```

Drill gradi release snapshot, podiže izolovanu PostgreSQL bazu/schema-u, izvozi v3
backup, odbija pogrešan ključ i checksum, obnavlja isti issuerRef, verifikuje
istorijski assertion i potvrđuje da Master outage ne blokira customer runtime.
Sačuvati završni JSON (`completedAt`, `outcome`, `checks`) uz release commit/digest.

## Periodični raspored

- dnevno: dead-letter/queue/scheduler/auth/catalog/key alarm pregled;
- mesečno: secret inventory i zero-count old-KID pregled;
- kvartalno i pre critical release-a: izolovani restore drill i incident tabletop;
- odmah posle rotacije: decrypt/read, rewrap, backup, historical assertion i packed
  host test pre povlačenja starog KID-a.
