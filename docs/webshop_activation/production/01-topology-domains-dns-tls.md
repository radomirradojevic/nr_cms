# 01 — Topologija, javni domeni, DNS i TLS

## 1. Prvo zaključati produkcijsku topologiju

Minimalni logički servisi:

| Uloga | Primer origin-a | Podaci | Inbound | Outbound |
| --- | --- | --- | --- | --- |
| Vendor CMS/Webshop | `https://nrcms.com` | vendor CMS/Webshop DB i storage | browser, odobreni payment webhookovi, cron | Master, worker, Stripe i/ili PayPal, Resend |
| Master License Server | `https://ls.nrcms.com` | license/release/intent/audit DB | vendor/client CMS, admin | customer well-known proof, registry evidence po ugovoru |
| Deployment worker | `https://deploy.nrcms.com` | job/fence/result DB | samo autorizovani CMS targeti | GitHub Packages/evidence, target control/data plane |
| Customer CMS | `https://customer.example` | customer CMS/Webshop DB/storage | browser, worker callback | Master, worker, payment/e-mail po customer konfiguraciji |

Origin-i su primeri osim postojećih `nrcms.com`/`ls.nrcms.com` odluka. Konačne
vrednosti se zaključavaju ADR-om i env/provisioning manifestom.

### Trust zone pravila

- Master, vendor CMS, worker i customer CMS imaju odvojene baze i runtime
  identitete.
- Worker DB role nema pravo na Master/vendor/customer tabele.
- CMS runtime nema DDL/owner prava.
- Registry read credential pripada worker fetch brokeru, ne CMS-u ili buildu.
- Target migration credential je phase-scoped i ne ide u job payload/log.
- Worker control plane nije javni admin API; mrežno i HMAC ograničiti poznatim
  targetima.

## 2. Platformski deployment gate

Pre DNS konfiguracije odlučiti adapter:

### Self-hosted Windows

Potreban je production naslednik postojećeg `windows_scm_winsw_v1` adaptera:

- production service identity i SID/DACL provisioning;
- production release root van source checkout-a;
- production DB/service/port imena iz potpisanog target policy-ja;
- loopback health sa exact build/release/package/hash proverom;
- atomarni pointer switch;
- compatible rollback i maintenance-required grana;
- backup pre migracije;
- bez `taskkill`, arbitrary command ili PID-only fallback-a.

### Vercel

Trenutni worker nije Vercel deployer. Potreban je poseban adapter koji mora:

- koristiti Vercel production OIDC/provider attestation, ne claim iz browsera;
- pripremiti immutable source/package/lock/migration input;
- izvršiti migraciju sa odvojenim migrator identitetom pre traffic promocije;
- vezati deployment ID/build ID za Master release i package digest;
- čekati health/readiness i tek zatim commitovati terminal receipt;
- podržati rollback samo na schema-compatible deployment;
- ne prosleđivati registry/payment/CMS runtime tajne build verifikatoru;
- imati response-loss/idempotency/reconciliation testove.

### Ostali provider-i

Netlify/Cloudflare/Render hint u activation kodu nije deployment implementacija.
Provider nije podržan dok nema zaseban adapter i packed E2E dokaz.

## 3. DNS inventar

Za svaki origin zapisati:

- FQDN i vlasnika zone;
- A/AAAA/CNAME target;
- očekivani javni IP opseg/provider;
- TTL i plan promene;
- ko sme da menja DNS;
- cert provider i renewal owner;
- expected canonical redirect (ako ga ima);
- health URL i SLO.

Pre produkcije:

1. svi A/AAAA odgovori su javni;
2. nema RFC1918, loopback, link-local, documentation ili mixed public/private
   odgovora za domen koji Master proverava;
3. IPv6 je ili ispravno rutiran i pokriven certifikatom ili AAAA nije objavljen;
4. nema wildcard DNS-a koji neočekivano prihvata neprovisionovan tenant;
5. CAA zapis dozvoljava izabrani CA;
6. DNSSEC se uključuje ako ga operativni tim može pouzdano održavati;
7. TTL se kontrolisano spusti pre migracije i vrati posle stabilizacije.

## 4. TLS zahtevi

- samo HTTPS za javne origin-e;
- validan javni CA chain i hostname/SAN;
- TLS 1.2 minimum, TLS 1.3 poželjan;
- automatsko renewal upozorenje pre isteka;
- HTTP -> HTTPS redirect dozvoljen je samo za browser površine; sigurnosni
  server-to-server endpoint-i u ugovorima zahtevaju exact HTTPS URL i često ne
  prate redirect;
- HSTS uključiti tek kada su svi subdomeni spremni; `includeSubDomains` i preload
  zahtevaju posebnu odluku;
- `NODE_TLS_REJECT_UNAUTHORIZED=0` je trajno zabranjen;
- production ne koristi lokalni Caddy CA niti `NODE_EXTRA_CA_CERTS` za javni CA.

Sačuvati cert chain/expiry/hostname proveru bez privatnog ključa.

## 5. Exact public URL ugovori

Vendor CMS:

```text
NEXT_PUBLIC_APP_URL=https://nrcms.com
WEBSHOP_PUBLIC_BASE_URL=https://nrcms.com
WEBSHOP_BUY_URL=https://nrcms.com/licenses/purchase-intents/accept
NR_MASTER_LICENSE_URL=https://ls.nrcms.com
NR_PURCHASE_INTENT_PUBLIC_KEYS_URL=https://ls.nrcms.com/.well-known/nr-purchase-intent-keys.json
NR_ADDON_DEPLOYMENT_WORKER_URL=https://deploy.nrcms.com
```

Pravila iz validatora:

- `NEXT_PUBLIC_APP_URL` je origin bez putanje;
- `WEBSHOP_BUY_URL` je HTTPS, port 443 i exact
  `/licenses/purchase-intents/accept`, bez credentials/query/fragment;
- worker URL je exact HTTPS origin bez path/query/fragment;
- Master URL nije HTTP izvan eksplicitnog loopback development-a;
- payment webhook je provider-specific exact ruta:
  `https://<vendor-domain>/api/webshop/payments/webhooks/stripe` ili
  `https://<vendor-domain>/api/webshop/payments/webhooks/paypal`;
- secure delivery link vodi kroz `/licenses/delivery/<token>` i mora imati
  `no-store`, `no-referrer`, `noindex`; token se ne stavlja u log/APM.

Ako vendor canonical host koristi `www`, sve navedene vrednosti moraju koristiti
istu zaključanu odluku; redirect nije zamena za exact server-to-server ugovor.

## 6. HTTPS well-known domain proof

Produkcijska aktivacija licence zahteva:

```text
GET https://<canonical-domain>/.well-known/nr-license-domain-proof/<challenge-uuid>
```

Master proverava:

- port 443, bez custom porta;
- DNS resolve i public-only sve odgovore;
- TLS chain/hostname sa `rejectUnauthorized=true`;
- DNS-pinned konekciju i SNI canonical hostname;
- timeout 5 sekundi;
- status 200;
- `Content-Type: application/json`;
- telo najviše 16 KiB;
- strict schema bez dodatnih polja;
- challenge, canonical domain, installation ID/fingerprint, payload, purpose i
  Ed25519 potpis.

Produkcijski proof mora imati `purpose=nr_license_domain_control` ili exact
transfer purpose u transfer toku. `development_allowlist_exemption` je NO-GO.

### Test

1. Pokrenuti activation challenge, ali još ne complete.
2. Sa spoljne mreže/DNS rezolvera proveriti javne A/AAAA odgovore.
3. Preuzeti exact well-known URL sa validacijom TLS-a i bez redirect-a.
4. Proveriti JSON content type, size i da nema cache/proxy transformacije.
5. Pustiti Master da sam uradi fetch; curl iz interne mreže nije dovoljan dokaz.
6. Potvrditi `domainVerificationMethod=https_well_known` u signed entitlement-u i
   audit događaju.
7. Negativno proveriti pogrešan challenge, potpis, domen, installation ID,
   private/mixed DNS odgovor i istekao challenge.

## 7. Outbound SSRF/DNS pinning

CMS/Webshop `safeFetch` već zahteva HTTPS, host allowlist, DNS preflight,
pinovani dispatcher, zabranu redirecta i bounded response. Produkcijski env:

- `NRLS_ALLOWED_OUTBOUND_HOSTS` sadrži samo stvarno potrebne hostove;
- `NRLS_ALLOW_SELF_HOSTED_OUTBOUND=false` za vendor koji kontaktira first-party
  Master, osim eksplicitno podržanog customer scenarija;
- `.nr.test`, localhost i private IP nisu dozvoljeni;
- proxy/firewall egress dozvoljava samo potrebne Stripe i/ili PayPal, Resend,
  Master, worker i registry origin-e;
- DNS rebinding i mixed-answer regression test ostaje deo release gate-a.

Ne dozvoljavati operatoru da proizvoljan URL iz request body-ja pretvori u worker
target ili Master proof destinaciju.

## 8. Edge/proxy konfiguracija

Za javni reverse proxy/CDN:

- prosleđivati originalni host/proto samo iz trusted proxy-ja;
- ne keširati payment webhook, activation, purchase intent, delivery i admin
  odgovore;
- webhook telo proslediti byte-identično; Stripe proverava raw-body potpis, a
  PayPal verifikacija zahteva neizmenjen događaj i `PAYPAL-*` transmission
  headere;
- ograničiti request body/timeouts bez presecanja validnog provider eventa;
- ne logovati `Authorization`, `Cookie`, `Stripe-Signature`, PayPal transmission
  signature/cert/ID headere, query/path approval/delivery token ili response body
  sa licencom;
- WAF ne sme menjati JSON proof/JWS/HMAC telo;
- health/live endpoint može biti dostupan samo monitoru/workeru prema topologiji.

## 9. DNS/TLS evidence gate

- [ ] ADR topologije i podržani adapter su odobreni.
- [ ] Svaki origin ima javni DNS inventar i vlasnika.
- [ ] TLS chain/hostname/expiry su validni iz spoljne mreže.
- [ ] Nema `.nr.test`, local CA ili insecure TLS promenljive.
- [ ] Master well-known fetch vraća `https_well_known` dokaz.
- [ ] Private/mixed DNS, redirect i invalid cert testovi fail-closed.
- [ ] Exact public URL/env matrica prolazi `npm run env:validate`.
- [ ] Webhook izabranog provider-a nema body/header transformaciju ili cache;
  Stripe raw-body i PayPal signed-header testovi prolaze.
- [ ] Delivery URL nije u proxy/APM access logu.

Ako bilo koja stavka nije dokazana, ne uključivati live checkout.
