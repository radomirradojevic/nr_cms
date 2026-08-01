# Faza 07 — staging security and operations runbook

> Finalna verifikacija 2026-07-12: dokument je pregledan, ali backup/restore, reconciliation, key rotation, emergency compromise i queue recovery drill **nisu izvršeni na staging-u** jer staging target i operator autorizacija nisu bili dostupni. Unit/test-DB dokaz nije zamena za staging run ID.

Ovaj runbook je za izolovani staging. Ne menja production secrets, DNS, deployment ili backup politiku.

## Secret inventory i hijerarhija

| Klasa | Vlasnik | Lokacija/config | Pravilo |
|---|---|---|---|
| Vendor Ed25519 signing | centralni servis | `NRLS_VENDOR_SIGNING_PRIVATE_KEY`, `NRLS_VENDOR_SIGNING_KID` | samo centralni servis; public set je verification-only |
| KEK / envelope encryption | CMS i centralni servis odvojeno | `NR_ADDON_INSTALLATION_ENCRYPTION_KEY`, `NRLS_SECRET_ENCRYPTION_KEY` + `*_KID` | po-record DEK, AES-256-GCM, AAD, nikad signing key |
| Service HMAC | Webshop ↔ centralni | `webshop_license_servers.auth_secret_encrypted`, `api_client_secret_versions` | version/kid, fingerprint, kratki overlap |
| Installation Ed25519 | CMS installation | installation identity storage | jedna instalacija, nikad customer issuer |
| Customer issuer | buduća faza 08 | customer-local secret store | izdvojeno iz vendor keyspace-a |
| Payment/webhook | Webshop | `WEBSHOP_{STRIPE,PAYPAL,PADDLE}_*`, `WEBSHOP_BANK_REDIRECT_WEBHOOK_SECRET` | jedan provider/integracija po secretu |
| Cron/redeploy | CMS/central | `WEBSHOP_LICENSE_ISSUE_CRON_SECRET`, `WEBSHOP_ENTITLEMENT_CRON_SECRET`, `LICENSE_SERVER_ENTITLEMENT_CRON_SECRET`, `NRLS_NONCE_CLEANUP_CRON_SECRET`, dedicated redeploy secret | nema fallback na `CRON_SECRET` u production konfiguraciji |

Pre postojećeg production rollout-a operator mora ukloniti sledeće compatibility fallback-e: `CRON_SECRET` za Webshop/LSA cron rute i stari plaintext `license_key` storage. Fallback ostaje samo radi expand/dual-read perioda, nije production acceptance.

## Staging drill: backup/restore i reconciliation

1. Zabeležiti webhook inbox watermark, fulfillment operation ID i central entitlement event watermark.
2. Restore CMS i centralnu bazu u izolovane staging instance; nikad preko aktivne baze.
3. Pokrenuti `npm run db:migrate` samo uz eksplicitni staging `DATABASE_URL`; centralni `npm run db:migrate` iz njegovog direktorijuma.
4. Pokrenuti Webshop fulfillment recovery i uporediti `webshop_license_server_operations` sa centralnim idempotency/event logom po stable operation/idempotency ključu.
5. Requeue samo neuspešne/stale lease redove; ne kreirati novu licencu ručno. Proveriti paid order bez aktivne licence i refund/chargeback bez revoke događaja.
6. Sačuvati agregirane rezultate, RPO/RTO vreme i redigovani log; obrisati izolovani restore po retention politici.

## Staging drill: key rotation i compromise

1. Generisati novi staging KMS/secret-store key, dodeliti novi `kid` i evidentirati `prepublished` metadata.
2. Objaviti public verification key; proveriti addon signature test sa starim i novim key-em.
3. Prebaciti signing na novi `kid`; stari zadržati verification-only najmanje token+grace period.
4. Za HMAC generisati novu secret version, postaviti `notBefore/activeUntil`, zatim opozvati samo kompromitovanu verziju.
5. Za kompromitovan key odmah markirati `revoked`, obustaviti signing, opozvati API secret verzije/sesije i rekoncilirati evente. Ne vraćati stari secret kroz rollback.

## Monitoring/alerting checklist

- Webhook signature failure, inbox/fulfillment lag i DLQ age.
- Paid order bez licence; refund/chargeback bez centralnog revoke/suspend uspeha.
- Centralni 401/403/409/5xx, scope/idempotency/signature/nonce replay greške.
- Activation brute-force i limit denials; signing key nearing `signing_stops_at`/`verification_stops_at`.
- DB pool saturation, migration ledger drift, nonce cleanup lag/table size.

Alerti nose samo request/correlation ID i fingerprint, nikad secret, license key ili PII.
