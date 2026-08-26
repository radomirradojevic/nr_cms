# Lokalni issuer commissioning i commerce E2E — 26. avgust 2026.

## Ishod i opseg

Lokalni Master/customer commissioning je završen za produkciono objavljene pakete
`@radomirradojevic/license-server-addon@0.2.1` i
`@radomirradojevic/webshop@0.6.44`. Javni CMS staging/production deploy nije
rađen i ostaje van odobrenog opsega.

Ovaj zapis pokriva:

- production authority verify/publish i lokalni evidence import;
- managed instalaciju oba add-on-a na customer CMS commit
  `72a0f106256d1b7616780ef034d226270a0344f8`;
- lokalnu Webshop kupovinu, potvrdu bank-transfer plaćanja, customer issuer
  operaciju, receipt, digitalnu isporuku i potpisani assertion;
- incidente i recovery korake koji su ostavili auditabilan trag, bez ručnog
  prepravljanja poslovnog rezultata u bazi.

## Produkcioni paketi

### License Server 0.2.1

License Server `0.2.1` je prethodno prošao production publication authority,
Master import/publish i managed install. Autoritativni release podaci su:

- source commit: `19a5735208f0089b5485837932da532023d12963`;
- CMS commit: `72a0f106256d1b7616780ef034d226270a0344f8`;
- artifact SHA-256:
  `b8285f03876baf4a4e4cd4345111aeac9ab6b95ebedd00aa908cd40ddeacb072`;
- migration bundle SHA-256:
  `e5b1e32557033ba532db00301725b9712c8a56cf190088d002912ace51503b44`;
- registry tarball SHA-256:
  `62135043d6123d09d2c877f7568e81aa34103a1dfac4f0cef57e631c81894114`;
- registry package-version ID: `1172104402`.

Detaljan purchase/activation/install trag je u dokumentu 28.

### Webshop 0.6.44

Tok od `0.6.39` do `0.6.44` otkrio je i zatvorio pet stvarnih integracionih
jazova:

| Verzija  | Zatvoreni jaz                                              |
| -------- | ---------------------------------------------------------- |
| `0.6.39` | typed release/artifact identitet                           |
| `0.6.40` | schema-verifier usklađivanje                               |
| `0.6.41` | pogrešna pretpostavka o nested product polju               |
| `0.6.42` | durable storefront binding prikaz                          |
| `0.6.43` | cart mutation i checkout binding                           |
| `0.6.44` | autoritativni V2 capture dokaz za ručno potvrđeno plaćanje |

Finalni Webshop release:

- package: `@radomirradojevic/webshop@0.6.44`;
- release ID: `1856ae03-6dff-5c34-9734-6dafa6020a1c`;
- source commit: `0f8817853d937ca7b404b96d0ddc39f488e1b1c1`;
- root artifact-lock commit: `ee491bfbcf922ae7aaf9eef4a2b78a4e9300176e`;
- artifact SHA-256:
  `10afa33dabaffcb2386114caeb0085af2ec164d432dbd3938ab7118c75166ec4`;
- migration bundle SHA-256:
  `594a64f2001453cd36e387acbfaf0a3e4f983f42125e6010c0cac881f1cd986b`;
- registry tarball SHA-256:
  `7644613c428d69d1405537aa0a8475248545dda4b0e87f71661bb2c812c8187c`;
- registry package-version ID: `1175495424`;
- published at: `2026-08-26T18:58:06Z`;
- signing key ID: `production-release:bfe65cdba790277d`;
- publication attestation SHA-256:
  `6c35557e7992adb54bd0dd4def0f2a61bb69aa2756d19df408b0e92c0573ae2a`;
- release receipt SHA-256:
  `42861b9a2f1da07db60dd89250063c68d6d12a3988847ade1e9e3c05c546ea0c`.

Verify workflow `33002168438` i publish workflow `33002451893` prošli su kroz
zaštićeni production environment. Evidence je verifikovan i staged van source
stabla u
`D:\nr_release_authority\evidence\1856ae03-6dff-5c34-9734-6dafa6020a1c`.

Prethodni workflow trag ostaje važan za audit:

- `0.6.39`: neuspešan `32957957189`, zatim uspešan `32958204673`;
- `0.6.40`: `32971380373`;
- odbijeni/nevažeći approval pokušaj: `32980525414`;
- `0.6.41`: `32980856087`;
- stale-outage verify za `0.6.42`: `32985832507`;
- `0.6.42`: verify `32991358851`, publish `32991909974`;
- `0.6.43`: verify `32996495828`, publish `32996743453`;
- `0.6.44`: verify `33002168438`, publish `33002451893`.

`0.6.38` je ostao superseded/untrusted i nikada nije instaliran.

## Managed upgrade dokaz

Lokalni Master je offline verifikovao production evidence, operator rola
`db-role:nrls_release_operator` je uvezla draft i objavila isti release, a
customer CMS je aktivirao deployment epoch `14`:

- operation: `1a8ca3d5-2f8b-4160-96e2-d9189c3fa0c6`;
- worker job: `dc7db539-6b70-4e8e-bd3b-d156b3b430e1`;
- installation: `ccf85491-eb0f-4f0c-931c-55afd414fec8`;
- generation/attempt: `1/1`;
- final status/runtime: `ready/ready`;
- installed version/release: `0.6.44` /
  `1856ae03-6dff-5c34-9734-6dafa6020a1c`;
- build ID:
  `06403fc78f83107b8af7c19da88ee9b47613278fbddfc6f72bda41f036264fc2`;
- fencing token: `48`;
- reconciliation receipt:
  `sha256:0879591901918e1c778d89cedec311e25b02fa379baebf3ec26a9df51d3fdd63`;
- migration ledger:
  `sha256:6e918cdd695ef9d18ee730ad1bf72bd42ccf7564c48aabf1d2f7f3a3c5a8568a`.

Hladni packed build trajao je približno 11 minuta. Heartbeat je ostao uredan,
nije napravljen duplikat joba, outbox je završen na prvom pokušaju uz HTTP 202 i
terminalni receipt.

Istorija epoha: `10` SCM incident/recovery, `11` Webshop `0.6.41`, `12`
Webshop `0.6.42`, `13` Webshop `0.6.43`, `14` Webshop `0.6.44`.

## Commerce fixture i V2 payment dokaz

Customer checkout je lokalno eksplicitno omogućen, a payment fixture koristi
`bank_transfer`; nijedan Stripe ili drugi provider secret nije kopiran niti
dupliran. Omogućene metode su `cash_on_delivery` i `bank_transfer`.

Prvi bank-transfer pokušaj pokazao je da admin `Mark paid` put nije upisivao
autoritativni capture reference, mode i transaction reference koje V2 payment
reducer zahteva. Webshop `0.6.44` zato upisuje:

- `captureMode: "cumulative"`;
- stabilni `captureReference` vezan za payment ID;
- jedinstveni provider event ID;
- isti autoritativni transaction reference.

Regresioni test je dodat u `tests/vendor-webshop-license-offer.test.ts`.
Izolovani release check je prošao typecheck, metadata proveru i `199/199`
testova. Završna worker acceptance izmena je commit `0c71454` sa rezultatom
`130 passed`, `16 environment-skipped`, `0 failed` od ukupno `146` testova;
lint, typecheck i build su takođe prošli.

## Finalni lokalni E2E

Tok koristi postojeći proizvod:

`/acceptance-store-1a1cb6654878/c/acceptance-products-802ac67f4ae0/p/acceptance-license-73ca34865f04`

i najpre je na nalogu `WEB-1004` potvrdio payment/issuer/fulfillment granicu:

- order ID: `f9e8a672-8e56-4735-8653-d153ee9e9f3e`;
- order-item ID: `6c7baa24-0437-4a30-adc5-53eab437f0e4`;
- issue ID: `489a53f7-d1f7-49eb-bc16-82dfc9ba3741`;
- amount: `120000 RSD` minor units;
- payment provider/reference: `bank_redirect` / `NRLOCAL-WEB-1004`;
- payment state: `paid`, captured `120000`, state version `1`;
- issuer operation: `op_c8bb38a2faae40f2bdb54fb855fb6197`;
- issuer operation result: `succeeded`, attempt `1`;
- central entitlement: `lic_5ddc72c52d094ff7ac0996ead2e556a5`;
- receipt: `rcpt_25ae0f16fcde44a3b1abd004b145dc99`;
- profile: `accept-73ca34865f04`, revision `1`;
- audience: `urn:nr:acceptance:73ca34865f04`;
- claims: `edition=pro`, `maxProjects=10`;
- Webshop operation: `succeeded`, attempt `2`;
- issue state: `issued/active`, sa šifrovanim ključem, fingerprintom i signed
  assertion-om.

`WEB-1002` i `WEB-1003` ostaju audit primeri fault/recovery ponašanja. Kod njih
je prekinuti HTTP caller potrošio V2 one-time reveal nakon issuer commit-a, a pre
Webshop commit-a. Nisu ručno menjani u bazi niti proglašeni uspešnim. `WEB-1004`
je zato izvršen kroz iste podržane job funkcije aktivnog managed runtime-a, u
istom procesu i nad eksplicitno vezanom customer bazom.

`WEB-1004` je zatim otkrio dve poslednje host/harness granice bez ručnog
menjanja poslovnog rezultata:

- managed client profil nije imao sopstveni issued-license KEK, pa browser SSR
  nije mogao da dešifruje envelope; generisan je jedinstveni
  `webshop-issued-license-kek-client-v1`, WEB-1004 envelope je atomski rewrapovan
  i root KEK nije kopiran;
- Webshop download odgovor je ispravno slao `Referrer-Policy: no-referrer`, ali
  ga je globalni CMS header prepisivao. CMS sada ima specifično strože pravilo
  za license delivery/download rute, a lokalni Caddy override je ograničen samo
  na `/api/webshop/licenses/file/*` kako Next Server Actions ne bi dobijale
  `Origin: null`;
- acceptance parser je koristio generičku granicu od `500 B` iako NRLS JWT
  transport dozvoljava `128 KiB`; verifier i regresioni test su usklađeni sa
  tim ugovorom.

Finalni čisti nalog je `WEB-1005`:

- order ID: `4206dafa-3f44-417a-ab1d-ff509d86b1f6`;
- order-item ID: `6e0e6204-0f37-498b-bc37-bbccf9076cff`;
- issue ID: `e8f9d7d0-1b78-4a05-8b31-722b14c44490`;
- payment: `paid`, `120000 RSD`, captured `120000`, state version `1`;
- payment provider/reference: `bank_redirect` / `NRLOCAL-WEB-1005`;
- issuer operation: `op_24798e60293c4739a5ca196ba3837092`, `succeeded`,
  attempt `1`;
- Webshop operation: `succeeded`, attempt `2`;
- central entitlement: `lic_df306e9174954370aeae87f34ed12756`;
- receipt: `rcpt_2395363cb28042fa850d7e0e2bb9c650`, reveal count `1`;
- final order/item state: `completed/fulfilled`;
- issue state: `issued/active`, reconciliation `resolved_active`;
- one-time browser reveal: `2026-08-26T21:02:50.709Z`;
- browser delivery completion: `2026-08-26T21:05:21.108Z`;
- client envelope KID: `webshop-issued-license-kek-client-v1`;
- signed download: HTTP `200`, `no-store`, attachment, NRLS MIME, `nosniff` i
  `no-referrer` (`5/5` header provera);
- assertion verification: `1/1`, Ed25519/JWT, issuer environment
  `development`, issuer ref `cms-638add16ead542ef`;
- verified SKU/claims: `accept-73ca34865f04`, `edition=pro`,
  `maxProjects=10`.

Završni browser rezultat: `PASS`.

## Završne provere

- root CMS: `410` testova, `399 passed`, `11 environment-skipped`, `0 failed`;
- root lint: `0` grešaka (`12` postojećih upozorenja);
- root typecheck i production build: `PASS`;
- Webshop izolovani release suite: `199/199`;
- worker: `146` testova, `130 passed`, `16 environment-skipped`, `0 failed`,
  uz uspešne lint, typecheck i build provere;
- specifični Next header i schema-contract regresioni testovi: `5/5`;
- lokalni Caddy hostovi `vendor`, `client`, `license`, `deploy health` i
  `PayPal fixture`: HTTP `200`.

## Završne granice

- Svih pet lokalnih Caddy hostova mora ostati HTTP 200: vendor, license,
  client, deploy health i PayPal fixture.
- Nema javnog CMS staging/production deploya.
- Nema privatnih signing ključeva, registry tokena, provider secret-a ili punog
  customer license ključa u ovom dokumentu.
- Production package authority je završen; lokalni commissioning nije zamena za
  budući, posebno odobren javni deploy.
