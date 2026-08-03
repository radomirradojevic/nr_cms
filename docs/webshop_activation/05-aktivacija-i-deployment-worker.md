# 05 — Aktivacija i deployment worker

## Cilj

Unos validnog license key-a mora pouzdano dovesti do:

    install_pending -> installed -> migration_pending -> ready

bez npm komande u HTTP requestu i bez korišćenja .private source-a.

## 1. Activation response contract V2

### GAP

Master trenutno vraća packageName i packageVersion iz hardkodovanog PACKAGE_CONFIG. Ne vraća artifact SHA, release signing KID, schema/runtime compatibility ili release ID.

### TARGET

Zadržati challenge/complete PoP tok. V2 challenge request mora pored postojećih license/domain/installation polja poslati exact signed host capability descriptor:

`installationKeyFingerprint` u ovom target contractu je uvek `sha256:` + lowercase SHA-256 canonical Ed25519 SubjectPublicKeyInfo DER bytes. CMS i master rade equivalent Node operaciju `createPublicKey(pem)`, zahtevaju `asymmetricKeyType === "ed25519"`, zatim `export({format:"der",type:"spki"})` i hashiraju dobijene bytes; ne hashiraju raw PEM string, whitespace ili line ending. Malformed/multi-key/trailing-data PEM, drugi key type i claimovani mismatch se odbijaju pre challenge inserta. Shared fixture koristi isti Ed25519 ključ zapisan sa LF/CRLF i različitim legalnim PEM line wrappingom i mora dati isti fingerprint, dok promenjen DER daje drugi.

DB CHECK/Drizzle/TypeScript koristi exact `installation_fingerprint_scheme=legacy_pem_utf8_sha256_v0|ed25519_spki_der_sha256_v1`. Postojeći raw-PEM hash redovi se označavaju `legacy_pem_utf8_sha256_v0`, nikada se ne prepisuju metadata-only. Dedicated signed fingerprint-rebind challenge zahteva PoP postojećim privatnim key-em i atomski vezuje isti installation/public-key DER za novi fingerprint uz lifecycle version bump; do tada legacy red nije eligible za novi managed deployment. Ako stari key ne može da dokaže PoP, koristi se auditovani re-enroll/transfer/support-recovery sa novim installation identitetom, ne tihi hash update.

    {
      "contractVersion": 2,
      "action": "challenge",
      "addonKey": "webshop",
      "licenseKey": "<USER_INPUT>",
      "canonicalDomain": "client.nr.test",
      "deploymentMode": "self_hosted",
      "installationId": "<UUID>",
      "installationPublicKey": "<PEM>",
      "installationKeyFingerprint": "sha256:<HEX>",
      "hostCapabilities": {
        "descriptorVersion": 1,
        "cmsVersion": "<EXACT_SEMVER>",
        "cmsCommitSha": "<40_LOWERCASE_HEX>",
        "nodeVersion": "<EXACT_SEMVER>",
        "nextVersion": "16.2.6",
        "runtimeContractVersion": "1",
        "coreSchemaVersion": 1,
        "installedAddonSchemaVersion": 0
      }
    }

Master canonicalizuje descriptor po exact schema-i, čuva njegove RFC 8785/JCS bytes i `sha256:<HEX>` u challenge ledgeru i uključuje hash u installation `proofPayload`. Complete ne ponavlja descriptor; potpis nad master bytes ga vezuje za installation identitet. Master release selector pre promene activation stanja bira samo `published` release čiji CMS/Node/Next range, runtime contract, core-schema minimum i kompletan addon migration path odgovaraju snapshotu. Među eligible stable redovima bira highest canonical SemVer, zatim `publishedAt DESC`, zatim `releaseId ASC`; stable prerelease/build metadata su zabranjeni. Revalidation nikada implicitno ne spušta installed/desired SemVer; rollback zahteva zasebnu auditovanu exact-release operaciju i schema-compatibility dokaz. Nema fallback-a na hardkodovani `PACKAGE_CONFIG` ako kompatibilan release ne postoji.

`runtimeContractVersion` je svuda exact JSON/string literal `"1"` — u host descriptoru, embedded manifestu, master catalogu, entitlement claim-u, deployment jobu i DB text koloni. Ne parsirati ga kao broj; shared fixture mora pasti za numeric `1`.

Challenge response uz postojeći challenge ID/proof bytes/expiry nosi i `{required, method, path}` `domainVerification` objekat iz dokumenta 07. U produkciji CMS na exact well-known putanji izlaže isti proof payload/signature i master ga sam fetch-uje uz strict HTTPS/SSRF policy pre complete commita. Lokalni `.nr.test` profil vraća `method=development_allowlist_exemption`, što se trajno auditira i nije dozvoljeno u produkciji.

Ovaj descriptor je potpisani selection input, ne jedini deployment autoritet. Worker kasnije meri stvarni target checkout/runtime/schema, rekonstruiše isti descriptor i zahteva isti hash; statički pinovani CMS SHA ostaje autoritativan. Neslaganje je `host_capability_mismatch` pre migracije/switch-a.

Complete response proširiti:

    {
      "contractVersion": 2,
      "activationId": "<UUID>",
      "environment": "development|staging|production",
      "signedEntitlement": "<SIGNED_JWS>",
      "licenseValidUntil": "<ISO_OR_NULL>",
      "entitlementEnvelopeExpiresAt": "<ISO>",
      "nextRevalidationAt": "<ISO>",
      "graceEndsAt": "<ISO_OR_NULL>",
      "installationId": "<UUID>",
      "installationKeyFingerprint": "sha256:<HEX>",
      "hostCapabilityDescriptorHash": "sha256:<HEX>",
      "domainVerificationMethod": "development_allowlist_exemption",
      "domainVerifiedAt": "<ISO_TIMESTAMP>",
      "domainVerificationChallengeId": "<UUID>",
      "licenseKeyRef": "<REDACTED_REFERENCE>",
      "release": {
        "releaseId": "<UUID>",
        "addonKey": "webshop",
        "packageName": "@radomirradojevic/webshop",
        "packageVersion": "<EXACT_SEMVER>",
        "artifactSha256": "<64_HEX>",
        "dependencyLockSha256": "<64_HEX>",
        "npmTarballSha256": "<64_HEX>",
        "npmTarballIntegrity": "sha512-<BASE64>",
        "embeddedManifestSha256": "<64_HEX>",
        "provenanceSha256": "<64_HEX>",
        "sbomSha256": "<64_HEX>",
        "publicationAttestationHash": "<64_HEX>",
        "registryPackageVersionId": "<DECIMAL_STRING>",
        "sourceReleasedAt": "<ISO_TIMESTAMP>",
        "publishedAt": "<ISO_TIMESTAMP>",
        "releaseSigningKid": "<PRODUCTION_KID>",
        "runtimeContractVersion": "1",
        "cmsVersionRange": "<SEMVER_RANGE>",
        "nodeVersionRange": "<SEMVER_RANGE>",
        "nextVersionRange": "<SEMVER_RANGE>",
        "minimumCoreSchemaVersion": 1,
        "schemaVersion": 1,
        "supportedAddonSchemaVersionMin": 1,
        "supportedAddonSchemaVersionMax": 2,
        "migrationBundleHash": "<64_HEX>",
        "supportedLicenseEditions": ["standard"],
        "channel": "stable"
      }
    }

Isti release objekat vraća revalidation kada se desired release promenio ili mora biti potvrđen. Target revalidation je takođe PoP challenge/complete contract: challenge prima `contractVersion=2`, `action=challenge`, activation/installation ID i isti exact `hostCapabilities`; master response bytes vezuju descriptor hash, activation ID i nonce, a complete prima samo challenge ID i installation signature. Master tek posle potpisa ponovo bira release. Time core CMS update ili promenjena schema ne koriste zastareli capability snapshot.

### 1.1 Exact signed entitlement V2

`signedEntitlement` je compact JWS. Protected header je strict objekat bez dodatnih polja:

```json
{"alg":"EdDSA","kid":"<ENTITLEMENT_SIGNING_KID>","typ":"NRV-ADDON-ENTITLEMENT-V2+JWT"}
```

Payload je strict `AddonEntitlementClaimsV2`:

```json
{
  "contractVersion": 2,
  "tokenUse": "addon_entitlement",
  "iss": "https://license-server.nrcms.com",
  "aud": "nr-cms-addon-runtime",
  "jti": "<UUID>",
  "iat": 1785456000,
  "nbf": 1785456000,
  "exp": 1788048000,
  "entitlementId": "<UUID>",
  "activationId": "<UUID>",
  "addonKey": "webshop",
  "environment": "development",
  "deploymentMode": "self_hosted",
  "canonicalDomain": "client.nr.test",
  "installationId": "<UUID>",
  "installationKeyFingerprint": "sha256:<64_LOWERCASE_HEX>",
  "licenseStatus": "active|suspended|expired|revoked|canceled",
  "activationStatus": "active|deactivated|transferred|revoked",
  "lifecycleVersion": 1,
  "activationLimit": 1,
  "edition": "standard",
  "features": [],
  "existingLicensePolicy": "allow_existing|disabled",
  "licenseValidUntil": null,
  "updatesUntil": null,
  "nextRevalidationAt": "<RFC3339_UTC_TIMESTAMP>",
  "graceEndsAt": "<RFC3339_UTC_TIMESTAMP_OR_NULL>",
  "domainVerificationMethod": "https_well_known|development_allowlist_exemption",
  "domainVerifiedAt": "<RFC3339_UTC_TIMESTAMP>",
  "domainVerificationChallengeId": "<UUID>",
  "hostCapabilityDescriptorHash": "sha256:<64_LOWERCASE_HEX>",
  "release": {
    "releaseId": "<UUIDV5>",
    "addonKey": "webshop",
    "packageName": "@radomirradojevic/webshop",
    "packageVersion": "<EXACT_SEMVER>",
    "artifactSha256": "<64_LOWERCASE_HEX>",
    "dependencyLockSha256": "<64_LOWERCASE_HEX>",
    "npmTarballSha256": "<64_LOWERCASE_HEX>",
    "npmTarballIntegrity": "sha512-<STANDARD_BASE64_WITH_PADDING>",
    "embeddedManifestSha256": "<64_LOWERCASE_HEX>",
    "provenanceSha256": "<64_LOWERCASE_HEX>",
    "sbomSha256": "<64_LOWERCASE_HEX>",
    "publicationAttestationHash": "<64_LOWERCASE_HEX>",
    "registryPackageVersionId": "<DECIMAL_STRING>",
    "sourceReleasedAt": "<RFC3339_UTC_TIMESTAMP>",
    "publishedAt": "<RFC3339_UTC_TIMESTAMP>",
    "releaseSigningKid": "<PRODUCTION_KID>",
    "runtimeContractVersion": "1",
    "cmsVersionRange": "<SEMVER_RANGE>",
    "nodeVersionRange": "<SEMVER_RANGE>",
    "nextVersionRange": "<SEMVER_RANGE>",
    "minimumCoreSchemaVersion": 1,
    "schemaVersion": 1,
    "supportedAddonSchemaVersionMin": 1,
    "supportedAddonSchemaVersionMax": 2,
    "migrationBundleHash": "<64_LOWERCASE_HEX>",
    "supportedLicenseEditions": ["standard"],
    "channel": "stable"
  }
}
```

`iat/nbf/exp` su NumericDate JSON integeri; ostala vremena su canonical RFC 3339 UTC stringovi ili eksplicitni `null`. Features su sorted unique stringovi. Aktivacioni complete izdaje samo `licenseStatus=active` i `activationStatus=active`; revalidation može potpisati ostale status vrednosti koje se primenjuju odmah. `exp` se tačno pretvara u top-level `entitlementEnvelopeExpiresAt`; top-level license/revalidation/domain/installation/release vrednosti moraju byte-semantically odgovarati verified claimovima. `environment` odgovara master/CMS profilu, a `activationStatus=transferred` starom installation identitetu daje terminalni disabled rezultat bez grace-a.

Master release selector za `updatesUntil` koristi isključivo immutable attested `release.publishedAt`, nikada source/commit `sourceReleasedAt`. Backdated commit objavljen posle non-null `updatesUntil` mora biti odbijen shared fixture-om. CMS zahteva jednakost top-level vrednosti, verified claim-a i svog durable local challenge descriptor hash-a; deployment job se gradi isključivo iz tog provereno jednakog claim-a. Ista provera važi za revalidation.

Verifier prihvata samo exact header, V2 payload schema, stable issuer/audience/tokenUse, vremenski važeći non-revoked keyset KID i očekivani addon/domain/installation/environment. Odbija unknown/duplicate polja, non-canonical base64url, V1 `v` payload pod V2 `typ`, purchase-intent/lifecycle token cross-use, numeric `runtimeContractVersion`, top-level mismatch i bilo koji promenjeni release evidence field. AS-BUILT `NRV-ADDON-ENTITLEMENT+JWT`/`v=1` reader postoji samo tokom eksplicitne migration/revalidation faze i njegov output ne može kreirati novi managed deployment job.

Detached attestation bytes se ne kopiraju u entitlement/job. Master iz immutable import zapisa izlaže exact public evidence rutu `GET /.well-known/nr-addon-releases/<RELEASE_UUID>/publication-attestation.json`. Ruta prihvata samo canonical UUID segment, nema query/redirect, vraća exact stored JCS bytes sa `Content-Type: application/json`, `Cache-Control: public, max-age=31536000, immutable` i strong ETag jednak `publicationAttestationHash`; draft/published/withdrawn istorijski red ostaje čitljiv radi audit/rollbacka, dok status i dalje kontroliše eligibility. Worker konstruiše URL samo iz statičkog `NRLS release evidence base URL` + already-validated UUID, koristi trusted HTTPS/allowlist/size-timeout policy, zahteva expected content hash, pa sam verifikuje attestation JWS protiv pinovanog release keyseta. Iz verified payload-a proverava provenance/SBOM hash, registry package version ID, tarball/manifest/artifact identitet i published vreme iz joba. Network nedostupnost pre mutacije je retryable; hash/signature mismatch permanent/incident prema key statusu.

Za lifetime licencu `licenseValidUntil` je `null`; ne koristi se trenutni sentinel 2099-12-31. JWS `exp`/`entitlementEnvelopeExpiresAt` ostaje konačan radi kriptografske i outage politike. `entitlementToken` može postojati samo kao version-1 compatibility alias tokom migracije.

Ne vraćati:

- GitHub PAT;
- NODE_AUTH_TOKEN;
- opšti registry credential;
- filesystem path;
- proizvoljan install command.

packageInstallToken i packageInstallTokenExpiresAt polja iz CMS šeme response-a ukloniti ili jasno deprecated-ovati. Hosted GitHub Packages token pripada workeru.

## 2. CMS activation transakcija

### Trenutni pogrešan redosled

Current action:

1. dobije entitlement;
2. proveri trenutni loader;
3. pošalje best-effort webhook;
4. proguta grešku;
5. tek onda sačuva entitlement.

### Ciljni redosled

Posle kriptografske provere master odgovora:

1. otvoriti DB transakciju;
2. upisati/obnoviti webshop_addon_entitlements;
3. upisati cms_addon_installations desired release;
4. kreirati cms_addon_operations red;
5. kreirati durable deployment outbox red;
6. commitovati;
7. vratiti UI-ju install_pending i operation ID;
8. publisher kasnije šalje workeru zahtev sa retry-em.

Ne raditi mrežni poziv dok je DB transakcija otvorena.

## 3. Autoritativna lokalna polja

webshop_addon_entitlements trenutno ima više novih kolona koje data layer ne puni i paralelna entitlementToken/signedEntitlement polja.

Ciljna odluka:

- signedEntitlement je autoritativni JWS;
- entitlementToken postaje compatibility alias tokom jedne migracije, zatim se uklanja;
- signingKid se eksplicitno čuva;
- verifiedClaims čuva samo prethodno validirane, neosetljive claims;
- lifecycleVersion se čuva top-level;
- lastRevalidationAttemptAt, lastRevalidationSuccessAt i graceEndsAt se čuvaju top-level;
- metadata ne duplira ista polja;
- packageInstalledAt postavlja samo reconciliation.

Data layer mora popuniti i čitati sva polja dosledno.

Eksplicitno razdvojiti vremenska polja u `webshop_addon_entitlements`:

    license_environment text not null
    license_valid_until timestamptz null
    entitlement_envelope_expires_at timestamptz not null
    next_revalidation_at timestamptz not null
    grace_ends_at timestamptz null

`license_valid_until=null` znači lifetime poslovno pravo; `entitlement_envelope_expires_at` dolazi samo iz verifikovanog JWS `exp`. Postojeći `expires_at` je compatibility kolona nejasne semantike: novi writer ga ne koristi kao autoritet, dual-read traje jednu verziju, zatim se kolona uklanja posebnom migracijom. Backfill prvo verifikuje postojeći signed entitlement i izvodi oba roka iz claimova; `2099-12-31` sentinel sa dokazanim lifetime SKU-om postaje `license_valid_until=null`, nikad 2099. Red bez proverljivog tokena/SKU semantike dobija postojeći install status `disabled` i error code `legacy_entitlement_revalidation_required` umesto nagađanja; uspešna reactivation/revalidation ga vraća kroz regularnu state machine. Constraint proverava da non-null business rok/grace ne nadžive dozvoljenu politiku, a test pokriva lifetime, timed, expired envelope i sentinel migraciju.

cms_addon_installations za webshop:

    addonKey=webshop
    licenseEnvironment=development|staging|production
    installationId=<LOCAL_INSTALLATION_ID>
    desiredReleaseId=<MASTER_RELEASE_ID>
    desiredPackageName=@radomirradojevic/webshop
    desiredPackageVersion=<EXACT_VERSION>
    desiredArtifactSha256=<MASTER_RELEASE_SHA>
    desiredDependencyLockSha256=<MASTER_DEPENDENCY_LOCK_SHA>
    desiredNpmTarballSha256=<MASTER_TARBALL_SHA>
    desiredNpmTarballIntegrity=<MASTER_RELEASE_SRI>
    desiredEmbeddedManifestSha256=<MASTER_MANIFEST_SHA>
    desiredProvenanceSha256=<MASTER_PROVENANCE_SHA>
    desiredSbomSha256=<MASTER_SBOM_SHA>
    desiredPublicationAttestationHash=<MASTER_ATTESTATION_SHA>
    desiredRegistryPackageVersionId=<DECIMAL_STRING>
    desiredSourceReleasedAt=<SIGNED_SOURCE_TIMESTAMP>
    desiredPublishedAt=<ATTESTED_REGISTRY_TIMESTAMP>
    desiredReleaseSigningKid=<MASTER_RELEASE_SIGNING_KID>
    desiredRuntimeContractVersion="1"
    desiredCmsVersionRange=<SEMVER_RANGE>
    desiredNodeVersionRange=<SEMVER_RANGE>
    desiredNextVersionRange=<SEMVER_RANGE>
    desiredMinimumCoreSchemaVersion=<INTEGER>
    desiredSchemaVersion=<INTEGER>
    desiredSupportedAddonSchemaVersionMin=<INTEGER>
    desiredSupportedAddonSchemaVersionMax=<INTEGER>
    desiredMigrationBundleHash=<64_HEX>
    desiredSupportedLicenseEditions=<SORTED_JSON_ARRAY>
    desiredReleaseChannel=stable
    desiredHostCapabilityDescriptorHash=sha256:<HEX>
    installationDeploymentEpoch=<MONOTONIC_BIGINT>
    entitlementSnapshotHash=sha256:<COMPACT_JWS_UTF8_HASH>
    entitlementLifecycleVersion=<INTEGER>
    entitlementEnvelopeExpiresAt=<TIMESTAMPTZ>
    installedReleaseId=null pre reconciliation-a
    installedPackageName=null pre reconciliation-a
    installedPackageVersion=null pre reconciliation-a
    installedArtifactSha256=null pre reconciliation-a
    installedDependencyLockSha256=null pre reconciliation-a
    installedNpmTarballSha256=null pre reconciliation-a
    installedNpmTarballIntegrity=null pre reconciliation-a
    installedEmbeddedManifestSha256=null pre reconciliation-a
    installedProvenanceSha256=null pre reconciliation-a
    installedSbomSha256=null pre reconciliation-a
    installedPublicationAttestationHash=null pre reconciliation-a
    installedRegistryPackageVersionId=null pre reconciliation-a
    installedSourceReleasedAt=null pre reconciliation-a
    installedPublishedAt=null pre reconciliation-a
    installedReleaseSigningKid=null pre reconciliation-a
    installedRuntimeContractVersion=null pre reconciliation-a
    installedCmsVersionRange=null pre reconciliation-a
    installedNodeVersionRange=null pre reconciliation-a
    installedNextVersionRange=null pre reconciliation-a
    installedMinimumCoreSchemaVersion=null pre reconciliation-a
    installedSchemaVersion=null pre reconciliation-a
    installedSupportedAddonSchemaVersionMin=null pre reconciliation-a
    installedSupportedAddonSchemaVersionMax=null pre reconciliation-a
    installedMigrationBundleHash=null pre reconciliation-a
    installedMigrationLedgerHash=null pre reconciliation-a
    installedSupportedLicenseEditions=null pre reconciliation-a
    installedReleaseChannel=null pre reconciliation-a
    installedHostCapabilityDescriptorHash=null pre reconciliation-a
    installedBuildId=null pre reconciliation-a
    status=license_accepted, zatim install_pending   -- desired-operation/reconciliation osa
    runtimeStatus=not_installed|ready|maintenance|unavailable
    deploymentJobId=null pre worker accept-a
    installAttemptCount=0
    version=<OPTIMISTIC_VERSION>

Današnja tabela nema ovaj release/fencing evidence niti odvojenu runtime osu. Dodati novu CMS migraciju za `webshop_addon_entitlements.release_id`, `license_environment`, JWS snapshot hash/lifecycle/expiry, kao i sva desired/installed release polja iz liste, `installation_deployment_epoch` bigint i `runtime_status` u `cms_addon_installations`/operation/outbox snapshotu. DB CHECK/TypeScript schema zaključavaju environment enum, `"1"` kao text runtime contract i hash/time formate; bez toga se V2 release identitet, entitlement freshness i stanje prethodnog dobrog runtime-a gube u statusu poslednje desired operacije.

## 4. Durable deployment outbox

Postojeći cms_addon_operations nije dovoljan za retry/lease transport. Proširiti ga ili dodati:

    cms_addon_deployment_outbox

Predložena polja:

    id uuid primary key
    addon_key text
    installation_id uuid
    operation_id uuid
    installation_deployment_epoch bigint
    deployment_intent_key text
    generation integer
    supersedes_operation_id uuid null
    operation_key text unique
    request_auth_kid text
    target_profile text
    license_environment text not null
    payload_version integer
    payload jsonb
    request_hash text
    status pending|sending|accepted|retry|completed|failed|superseded|dead_letter
    attempt_count integer
    max_attempts integer
    next_attempt_at timestamptz
    lease_token uuid
    lease_expires_at timestamptz
    worker_job_id text
    last_http_status integer
    last_error_code text
    last_error_message text
    created_at timestamptz
    accepted_at timestamptz
    completed_at timestamptz

Public serving race se zatvara zasebnim CMS autoritetom:

    cms_addon_serving_fences
    id uuid primary key
    target_profile text not null
    addon_key text not null
    installation_id uuid not null
    operation_id uuid not null unique
    worker_job_id text not null
    installation_deployment_epoch bigint not null
    generation integer not null
    pre_operation_serving_state_hash text not null
    pre_operation_terminal_receipt_id uuid null
    state active|resolved_success|resolved_recovery|resolved_no_mutation
    started_at timestamptz not null
    terminal_receipt_id uuid null
    resolved_at timestamptz null
    unique (target_profile, addon_key, installation_id, installation_deployment_epoch, generation)
    partial unique (target_profile, addon_key) where state='active'

DB controller pod installation fence-om i target mutexom mora pozvati closed command `begin_serving_mutation_fence` i commitovati `active` red pre prvog service-stop, service-config ili pointer write-a. To je konzervativna zabrana serviranja, ne tvrdnja da se pointer već promenio. Public addon gate proverava da ne postoji aktivan red; zato crash odmah posle ovog commita, kao i same-release redeploy čiji loaded tuple inače liči na stari, ne može koristiti prethodni receipt/`ready`. Tačno success promotion, recovery ili dokazani no-mutation terminal writer u istoj transakciji upisuje odgovarajući immutable receipt i CAS-om razrešava red vezujući `terminal_receipt_id`. Niko ne briše fence red; current active fence bez terminalnog receipt-a znači fail-closed. Recovery pod novim target/installation lockovima prvo čita ovaj red, pointer i loaded tuple pa donosi jednu terminalnu odluku.

Svaka promena desired release-a ili entitlement snapshota koja zahteva deployment u istoj CMS transakciji povećava monotoni `installation_deployment_epoch` za taj exact `(targetProfile, addonKey, installationId)`. Novi desired epoch atomski označava svaki stariji non-terminalni operation istog installation ključa `superseded` i postoji partial unique constraint za tačno jedan current non-terminalni desired operation po installation-u. Retry transporta istog desired stanja ne povećava epoch.

Logički desired-state ključ je stabilan unutar tog epoch-a:

    deploymentIntentKey=addon-deploy-intent:v3:<installationId>:<deploymentEpoch>:<releaseId>

Svaki stvarni worker run ima monotonu generaciju i unique ključ:

    operationKey=addon-deploy:v3:<installationId>:<deploymentEpoch>:<releaseId>:<generation>

U JSON wire-u `installationDeploymentEpoch` je canonical decimal string koji odgovara `^[1-9][0-9]{0,18}$` i čija BigInt vrednost nije veća od PostgreSQL signed bigint maksimuma `9223372036854775807`; nikada nije JavaScript number. U operation key-u koristi isti decimalni tekst bez leading nule. `generation` je bounded positive JSON integer (`<= 2147483647`).

Prva generacija je 1. Isti activation/HTTP retry nalazi isti non-terminalni operation i ne pravi drugu generaciju. DB unique `(deployment_intent_key, generation)` i partial unique za jedan non-terminalni operation po intentu sprečavaju paralelne run-ove. Worker tabela `addon_deployment_target_states` ima primary key `(target_profile, addon_key, installation_id)` i polja `highest_accepted_epoch bigint`, `highest_generation integer`, `current_operation_id`, `updated_at` i optimistic `version`. Acceptance višeg epoch-a supersede-uje samo niže queued run-ove istog primary key-a; niži epoch tog installation-a se posle toga nikad ne izvršava. Drugi `installationId` na istom targetu ima nezavisan epoch prostor i može legitimno početi od 1.

Receiver pod row lock-om primenjuje exact lexicographic pair-CAS nad `(installationDeploymentEpoch,generation)` za taj primary key:

1. incoming epoch manji od `highest_accepted_epoch` je `stale_epoch` i ne kreira job;
2. incoming epoch veći od highest prihvata se samo sa `generation=1`; atomski postavlja `(highest_accepted_epoch,highest_generation)=(incomingEpoch,1)`, current operation i supersede-uje samo starije queued poslove istog installation ključa;
3. isti epoch i manja generation je `stale_generation`;
4. isti epoch i ista generation je dozvoljen samo kao exact replay istog operation ID/key i request-body hash-a i vraća isti job; bilo koja druga vrednost je `409 operation_binding_conflict`;
5. isti epoch i `generation=highest_generation+1` prihvata se samo ako `supersedesOperationId` pokazuje baš prethodni terminalni worker job/result sa dozvoljenim `retryable + rejected_before_switch|rolled_back` tuple-om i CMS request je za isti intent/release; tada CAS atomski povećava highest generation/current operation;
6. generation gap veći od jedan, generation reset unutar istog epocha ili generation različit od 1 uz novi epoch je `409 invalid_generation_transition`.

Unique operation key i `(deployment_intent_key,generation)`, zaključan state red i job insert commit-uju se zajedno. `highest_generation` se zato resetuje na 1 samo pri prihvatanju višeg epocha; nikada se ne prenosi sa starog installation identiteta niti se ažurira iz callbacka.

Target-wide serializacija je zaseban contract, a ne deo installation-scoped epoch poređenja. Worker job store ima `addon_deployment_target_mutexes` sa primary key-em `target_profile` i najmanje `owner_job_id`, monotoni `fencing_token bigint`, `lease_expires_at`, `heartbeat_at` i optimistic `version`. Mutation worker na dedicated job-store konekciji drži PostgreSQL session advisory lock izveden iz versioniranog namespace-a i `target_profile`, u istoj transakciji/critical-section CAS-om preuzima mutex red i dobija sledeći fencing token. Konekcija i heartbeat ostaju aktivni od prve target filesystem/DB/service mutacije kroz pointer switch, CMS reconciliation, bounded final readiness i terminalni success/recovery receipt. Gubitak advisory konekcije, lease-a ili vlasništva odmah prekida dalje mutacije; recovery najpre proverava stvarni pointer, CMS operation fence/candidate/terminal receipt i prethodni token, pa tek onda može preuzeti viši token. Time dva installation identiteta ne mogu paralelno menjati isti target, dok novi installation sa epochom 1 nije lažno stale zbog starog installation-a sa epochom 50. Deactivated/transferred stari identitet dodatno pada na CMS activation/fence proveri. Shared fixture pokriva stari installation epoch 50 i novi installation epoch 1 na istom targetu, kao i crash/gubitak lease-a: novi se prihvata, kasni stari job nema nijednu mutation posle višeg target fencing tokena.

Nova generacija nastaje compare-and-swap transakcijom samo kada je prethodna dobila autentifikovan `errorClass=retryable` uz `failed+rejected_before_switch` ili `failed+rolled_back` sa dokazano zdravim starim runtime-om. `permanent` je terminalan za taj intent; `incident`, `maintenance_required` i `rollback_failed` zahtevaju incident recovery, ručnu reconciliation i eksplicitno auditovano clearance. Sam callback timeout, izgubljen response ili nepoznato stanje nikada ne stvara novu generaciju: ponavlja se isti dispatch ili worker result outbox. Requeue kreira novi operation ID/key, povećava generation, postavlja `supersedes_operation_id`, zadržava isti epoch/intent/release i auditira reason/actor. Terminal `succeeded` nije requeue-abilan; drugi desired release ili promenjen entitlement snapshot dobija veći epoch i drugi intent key.

`errorClass` je closed enum `retryable|permanent|incident|null`: `null` je dozvoljen samo za success. Network/registry transient, process timeout pre switch-a i klasifikovan 5xx su `retryable`; signature/hash/schema/compatibility/policy mismatch je `permanent`; unknown runtime state, failed rollback, compromised key/credential i manual maintenance su `incident`. Worker i CMS dele versionirani `DeploymentErrorV1` fixture; ne izvode retryability iz slobodnog `errorCode` stringa.

### 4.1 Cross-release i entitlement fencing

Job ne sadrži raw license key ili JWS, ali nosi `entitlementSnapshotHash=sha256:<HASH_OF_EXACT_COMPACT_JWS_UTF8>`, `entitlementLifecycleVersion` i `entitlementEnvelopeExpiresAt`. Build/download se može raditi bez CMS DB lock-a. Neposredno pre prve DB mutacije worker otvara dedicated konekciju ka target CMS bazi, uzima session advisory lock i kroz jedan shared data-access contract ponovo čita installation/entitlement red. CMS activation/revalidation/deactivation/transfer/revoke i desired-release mutation moraju uzimati isti advisory transaction lock pre promene tih redova.

Exact lock key derivacija je: `input=UTF8("NR-ADDON-DEPLOY-FENCE-V1\n" + canonicalLowercaseInstallationUuid)`, `digest=SHA-256(input)`, uzeti prvih osam bytes kao big-endian unsigned 64-bit i reinterpretirati two's-complement u signed int64, pa pozvati `pg_advisory_lock($1::bigint)`/`pg_advisory_xact_lock` sa tom decimalnom vrednošću. UUID nema braces i koristi lower-case canonical crtice. Worker session lock i CMS transaction lock dele isti helper/fixture. Vektor za installation `00000000-0000-0000-0000-000000000001` ima digest `dc2cefa12599a8b3fd75904ac3ab3f964c8dee738535e9b3b9fd7d98f757352a` i signed ključ `-2581425010990536525`.

Dok drži lock worker zahteva: isti current deployment epoch/intent/generation/operation, isti desired release/evidence, isti entitlement snapshot hash/lifecycle, `activationStatus=active`, `licenseStatus=active`, neistekao envelope/business validity i ne-superseded operation. Istu proveru ponavlja neposredno pre pointer switch-a na istoj lockovanoj konekciji. Lock se drži od prvog durable CMS operation-phase write-a (`status=installed`) kroz migration/pointer/service mutation, candidate reconciliation i bounded final readiness, sve do commita tačno jednog terminalnog success ili recovery receipt-a. Tek posle tog commita smeju se osloboditi DB session lock, controller lease i target mutex; zato konkurentna lifecycle/desired transakcija ima jedno serializable uređenje, a ne race. Lock ima bounded statement/lock timeout i crash recovery; timeout ne znači odobrenje.

Ako je fence promenjen tokom dugog builda, worker završava `rejected_before_switch/stale_deployment_fence` bez migracije/switch-a. Ako je viši epoch čekao dok je stari worker već u zaključanoj mutation fazi, stari switch se serializuje pre desired promene, zatim viši epoch postaje current i ide napred; stari job nikada ne može switch-ovati posle novijeg. Shared concurrency fixture pokriva A(epoch 10) spor, B(epoch 11) prihvaćen/switch-ovan, pa kasni A — A mora biti odbijen pre mutacije; revoke/deactivation ili entitlement expiry tokom builda takođe moraju dati nula migration/switch write-ova.

Publisher koristi FOR UPDATE SKIP LOCKED, lease recovery, exponential backoff i DLQ. Callback failure se ne guta.

## 5. Redeploy callback V2

Current NR-REDEPLOY-V1 canonical HMAC može ostati za compatibility, ali novi tok treba V2.

Exact request headers za oba smera su:

    Content-Type: application/json
    X-NR-Deploy-Auth-Version: 2
    X-NR-Deploy-Key-Id: <KID>
    X-NR-Deploy-Request-Id: <UUID>
    X-NR-Deploy-Timestamp: <UNIX_SECONDS_DECIMAL>
    X-NR-Deploy-Signature: v2=<BASE64URL_NO_PADDING>

Query je zabranjen na V2 deployment rutama. `path` je tačan percent-encoded request pathname koji počinje `/`; method je uppercase. Sender JSON serializuje jednom u UTF-8 bytes i iste bytes šalje. `bodySha256` je lowercase 64-hex SHA-256 originalnih bytes. Canonical UTF-8 string, bez završnog newline-a, jeste:

    NR-DEPLOY-HMAC-V2\n<KID>\n<REQUEST_ID>\n<UNIX_SECONDS>\n<METHOD>\n<PATH>\n<BODY_SHA256_HEX>

Signature bytes su `HMAC-SHA-256(secret, canonicalUtf8Bytes)`, kodirani base64url bez paddinga. Receiver odbija duplicate header, drugi auth version, necanonical UUID/timestamp, query, više od 300 sekundi clock skew-a, body iznad limita, body hash mismatch, unknown/revoked KID i replay request ID. Poređenje potpisa je constant-time, a replay ID se durable troši tek zajedno sa idempotentnim accept/result zapisom.

Svaki response takođe je authenticated. Headeri su `X-NR-Deploy-Key-Id` i:

    X-NR-Deploy-Response-Signature: v2=<BASE64URL_NO_PADDING>

Response canonical UTF-8 string bez završnog newline-a je:

    NR-DEPLOY-HMAC-V2-RESPONSE\n<KID>\n<ORIGINAL_REQUEST_ID>\n<HTTP_STATUS_DECIMAL>\n<RESPONSE_BODY_SHA256_HEX>

Receiver potpisuje response tačno istim KID-em/secretom kojim je uspešno verifikovao request, uključujući retained old KID; ne bira svoj trenutni active KID. Sender zahteva header/canonical KID jednak originalnom request KID-u. Zato replay/response posle rotacije ostaje proverljiv dok traje old-key retention.

Sender requesta proverava response signature pre nego što upiše `accepted`, `completed` ili permanent conflict. Prazan response body ima SHA-256 praznog byte niza. Ovaj contract dobija shared byte fixture sa exact request/response bytes, hashom, canonical stringom i očekivanim potpisom u CMS i worker repo-u.

Payload:

    {
      "version": 2,
      "operationId": "<UUID>",
      "installationDeploymentEpoch": "10",
      "deploymentIntentKey": "<STABLE_DESIRED_STATE_KEY>",
      "generation": 1,
      "supersedesOperationId": null,
      "operationKey": "<STABLE_KEY>",
      "addonKey": "webshop",
      "environment": "development|staging|production",
      "installationId": "<UUID>",
      "releaseId": "<UUID>",
      "packageName": "@radomirradojevic/webshop",
      "packageVersion": "<EXACT_SEMVER>",
      "artifactSha256": "<64_HEX>",
      "dependencyLockSha256": "<64_HEX>",
      "npmTarballSha256": "<64_HEX>",
      "npmTarballIntegrity": "sha512-<BASE64>",
      "embeddedManifestSha256": "<64_HEX>",
      "provenanceSha256": "<64_HEX>",
      "sbomSha256": "<64_HEX>",
      "publicationAttestationHash": "<64_HEX>",
      "registryPackageVersionId": "<DECIMAL_STRING>",
      "sourceReleasedAt": "<ISO_TIMESTAMP>",
      "publishedAt": "<ISO_TIMESTAMP>",
      "releaseSigningKid": "<KID>",
      "runtimeContractVersion": "1",
      "cmsVersionRange": "<SEMVER_RANGE>",
      "nodeVersionRange": "<SEMVER_RANGE>",
      "nextVersionRange": "<SEMVER_RANGE>",
      "minimumCoreSchemaVersion": 1,
      "schemaVersion": 1,
      "supportedAddonSchemaVersionMin": 1,
      "supportedAddonSchemaVersionMax": 2,
      "migrationBundleHash": "<64_HEX>",
      "supportedLicenseEditions": ["standard"],
      "releaseChannel": "stable",
      "hostCapabilityDescriptorHash": "sha256:<HEX>",
      "entitlementSnapshotHash": "sha256:<HEX>",
      "entitlementLifecycleVersion": 3,
      "entitlementEnvelopeExpiresAt": "<ISO_TIMESTAMP>",
      "preOperationServingStateHash": "sha256:<HEX>",
      "preOperationMigrationLedgerHash": "sha256:<HEX>"
    }

Ne slati entitlement JWS ni license key. Worker dobija samo minimum za deployment. `supersedesOperationId` je obavezno `null` kada je `generation=1`; kod `generation>1` je canonical UUID neposredno prethodnog terminalnog retryable operationa istog intent/epoch/release-a. Ovo polje je deo exact HMAC-potpisanog body-ja i jedini je dozvoljeni lineage dokaz za generation+1 pair-CAS. `environment` dolazi isključivo iz CMS `NR_LICENSE_ENVIRONMENT` i mora byte-equal verified entitlement claim-u, persisted entitlement/installation/operation snapshotu i worker statičkom target `licenseEnvironment`; target vrednost mora odgovarati `NR_ADDON_DEPLOYMENT_WORKER_ENVIRONMENT`. Ne izvodi se iz `NODE_ENV`, profila, URL-a ili baze. `preOperationServingStateHash` je SHA-256 RFC 8785/JCS strict `PreOperationServingStateV1` projekcije: `{contractVersion:1,purpose:"addon_pre_operation_serving_state",installationId,runtimeStatus,installedEvidence}`. `installedEvidence` ima tačno ključeve `installedReleaseId`, `installedPackageName`, `installedPackageVersion`, `installedArtifactSha256`, `installedDependencyLockSha256`, `installedNpmTarballSha256`, `installedNpmTarballIntegrity`, `installedEmbeddedManifestSha256`, `installedProvenanceSha256`, `installedSbomSha256`, `installedPublicationAttestationHash`, `installedRegistryPackageVersionId`, `installedSourceReleasedAt`, `installedPublishedAt`, `installedReleaseSigningKid`, `installedRuntimeContractVersion`, `installedCmsVersionRange`, `installedNodeVersionRange`, `installedNextVersionRange`, `installedMinimumCoreSchemaVersion`, `installedSchemaVersion`, `installedSupportedAddonSchemaVersionMin`, `installedSupportedAddonSchemaVersionMax`, `installedMigrationBundleHash`, `installedLedgerHash`, `installedSupportedLicenseEditions`, `installedReleaseChannel`, `installedHostCapabilityDescriptorHash` i `installedBuildId`; svaki absent value je eksplicitni JSON null, nema unknown polja, a edition niz zadržava canonical sort. `preOperationMigrationLedgerHash` je normalni non-null `migrationLedgerHash` tadašnjeg `MigrationLedgerEvidenceV1`, uključujući empty ledger hash. CMS računa canonical bytes/hash i čuva ih uz immutable operation/outbox snapshot u istoj activation/desired transakciji; worker ih nikada ne prihvata iz drugog izvora.

Receiver proverava:

- exact content type;
- body size;
- poznat KID;
- timestamp skew, na primer najviše pet minuta;
- constant-time HMAC;
- request ID replay;
- operationKey idempotency;
- exact target route;
- exact package allowlist;
- exact SemVer bez range-a;
- artifact SHA format;
- target ruta ima statički pinovan CMS SHA i source mirror u worker konfiguraciji.

Job body namerno ne bira CMS commit. Capability descriptor nosi potpisani observed commit i hash kao compatibility dokaz, ali ne može promeniti target. Worker uzima `cmsCommitSha` iz statičke target konfiguracije, zahteva da observed descriptor odgovara tom SHA-u i posle installa proverava da `provenance.materials.cmsGitSha` odgovara istom SHA-u.

Odgovor:

    HTTP 202
    {
      "version": 2,
      "jobId": "<WORKER_JOB_ID>",
      "status": "accepted",
      "operationId": "<SAME_OPERATION_UUID>",
      "installationDeploymentEpoch": "10",
      "generation": 1,
      "operationKey": "<SAME_KEY>"
    }

CMS upisuje workerJobId/deploymentJobId i nastavlja da prati rezultat.

### 5.1 Exact worker result callback

Prvi target koristi callback, ne alternativni polling contract. Worker po završetku ili posle uspešnog rollback-a retryable šalje na statički target URL:

    POST https://vendor.nr.test/api/internal/addons/deployment-results
    POST https://client.nr.test/api/internal/addons/deployment-results

Body V2:

    {
      "version": 2,
      "resultId": "<UUID>",
      "operationId": "<ORIGINAL_UUID>",
      "installationId": "<ORIGINAL_INSTALLATION_UUID>",
      "installationDeploymentEpoch": "10",
      "deploymentIntentKey": "<ORIGINAL_DESIRED_STATE_KEY>",
      "generation": 1,
      "operationKey": "<ORIGINAL_STABLE_KEY>",
      "workerJobId": "<WORKER_JOB_ID>",
      "targetProfile": "vendor|client",
      "environment": "development|staging|production",
      "status": "succeeded|failed",
      "finalPhase": "ready|rejected_before_switch|rolled_back|maintenance_required|rollback_failed",
      "runtimeStatus": "ready|not_installed|maintenance|unavailable",
      "releaseId": "<UUID>",
      "packageName": "@radomirradojevic/webshop",
      "packageVersion": "<EXACT_SEMVER>",
      "npmTarballSha256": "<64_HEX>",
      "npmTarballIntegrity": "sha512-<BASE64>",
      "artifactSha256": "<64_HEX>",
      "dependencyLockSha256": "<64_HEX>",
      "embeddedManifestSha256": "<64_HEX>",
      "provenanceSha256": "<64_HEX>",
      "sbomSha256": "<64_HEX>",
      "publicationAttestationHash": "<64_HEX>",
      "registryPackageVersionId": "<DECIMAL_STRING>",
      "sourceReleasedAt": "<ISO_TIMESTAMP>",
      "publishedAt": "<ISO_TIMESTAMP>",
      "releaseSigningKid": "<KID>",
      "runtimeContractVersion": "1",
      "cmsVersionRange": "<SEMVER_RANGE>",
      "nodeVersionRange": "<SEMVER_RANGE>",
      "nextVersionRange": "<SEMVER_RANGE>",
      "minimumCoreSchemaVersion": 1,
      "schemaVersion": 1,
      "supportedAddonSchemaVersionMin": 1,
      "supportedAddonSchemaVersionMax": 2,
      "migrationBundleHash": "<64_HEX>",
      "supportedLicenseEditions": ["standard"],
      "releaseChannel": "stable",
      "entitlementSnapshotHash": "sha256:<HEX>",
      "entitlementLifecycleVersion": 3,
      "entitlementEnvelopeExpiresAt": "<ISO_TIMESTAMP>",
      "activeReleaseId": "<CURRENTLY_SERVING_RELEASE_UUID_OR_NULL>",
      "observedServicePointerReleaseId": "<POINTER_RELEASE_UUID_OR_NULL>",
      "cmsCommitSha": "<STATIC_TARGET_SHA>",
      "observedHostCapabilityDescriptorHash": "sha256:<HEX>",
      "buildId": "<ID_OR_NULL>",
      "migrationLedgerHash": "<sha256:64_LOWERCASE_HEX_OR_NULL>",
      "terminalEvidenceKind": "reconciliation_receipt|recovery_receipt|no_mutation_receipt",
      "terminalEvidenceHash": "sha256:<64_LOWERCASE_HEX>",
      "noMutationEvidence": null,
      "errorClass": "retryable|permanent|incident|null",
      "errorCode": "<SANITIZED_CODE_OR_NULL>",
      "occurredAt": "<ISO_TIMESTAMP>"
    }

Callback koristi poseban per-target `WEBSHOP_DEPLOYMENT_RESULT_AUTH_KID/SECRET`, različit od CMS→worker redeploy credentiala. Worker result outbox trajno čuva `result_auth_kid` pri prvom kreiranju exact result body-ja i ima unique `(operation_id, worker_job_id)`: jedan worker job može proizvesti samo jedan canonical terminalni `result_id/body_hash/final tuple`. Svaki retry koristi isti KID/secret, result ID i exact body iz active+old keyring-a; worker ne „ispravlja” već emitovan failed rezultat novim success body-jem.

CMS dodaje durable `cms_addon_deployment_results` binding sa najmanje:

    result_id uuid unique not null
    operation_id uuid not null
    worker_job_id text not null
    result_body_hash text not null
    result_status text not null
    final_phase text not null
    terminal_evidence_kind text not null
    terminal_evidence_hash text not null
    received_payload jsonb not null
    initial_ack text not null
    received_at timestamptz not null
    unique (operation_id, worker_job_id)

Handler prvo završava HMAC/body/schema proveru, zatim po `operationId` pod row lock-om učitava immutable historical `cms_addon_operations` + deployment-outbox body snapshot/hash za baš tu operaciju. Result se prvo u celosti proverava prema tom historical snapshotu, čak i kada više nije current; current installation red se tek potom učitava da odredi početnu klasifikaciju `applied` ili jedan od stale ACK-ova. Tek kada sve prođe, ista transakcija insertuje canonical result binding, čuva tu klasifikaciju kao immutable `initial_ack` i CAS-om zatvara samo dozvoljeni historical/current operation transport metadata. Nevalidan prvi body ne sme poison-ovati unique binding red. Ako red već postoji, isti `(resultId, bodyHash)` i isti operation/job/final tuple vraća HTTP 200 sa `ack=duplicate`, bez menjanja `initial_ack` ili bilo kog stanja; `duplicate` semantički potvrđuje prethodno sačuvanu početnu klasifikaciju. Isti `resultId` sa drugim hashom ili isti `(operationId,workerJobId)` sa bilo kojim drugim result ID/hash/status/final tuple-om je `409 result_binding_conflict`, security incident i nikada drugi state transition. HMAC V2 vezuje KID, request ID, timestamp, method, exact path i original-body hash. CMS proverava:

- target profile odgovara sopstvenom profilu;
- environment odgovara immutable historical operation/outbox snapshotu, CMS `NR_LICENSE_ENVIRONMENT` i verifikovanom entitlementu; callback sa drugim environmentom je `invalid_result_tuple`, ne stale rezultat;
- deployment epoch/intent/generation, operation ID/key, worker job ID i desired release potpuno odgovaraju immutable historical operation/outbox snapshotu; ne porede se prvo sa current desired redom;
- entitlement snapshot hash/lifecycle/expiry i sva package/tarball/manifest/attestation/time/KID/runtime/schema evidence polja odgovaraju desired redu;
- `failed` čuva historical desired release/error/evidence; za rolled-back/maintenance/unavailable rezultat proverava već postojeći fenced recovery receipt, a za `rejected_before_switch` exact no-mutation receipt iz nastavka, umesto drugog upisa installed/current polja;
- unique `resultId` i unique `(operationId, workerJobId)` vezuju tačno jedan canonical body/final tuple;
- isti result/body replay vraća `200 ack=duplicate`; prvi prihvaćeni poziv vraća `applied|stale_installation_ignored|stale_epoch_ignored|stale_generation_ignored`, a isti result/drugi hash vraća `409`;
- tek posle historical verifikacije callback prvo poredi `installationId`. Ako current addon installation ima drugi identitet, validan rezultat prethodnog identiteta dobija `stale_installation_ignored`; epoch/generation brojevi između dva installation identiteta nikada se ne porede. Samo kada je `installationId` isti, veći current epoch daje `stale_epoch_ignored`, isti epoch sa većom current generation daje `stale_generation_ignored`, a manji current tuple je incident. Stale rezultat se vezuje samo za historical operation/result audit i ne menja current operation, installed/current pointer, runtime ili failure banner. Samo exact current installation/epoch/generation tuple sme zatvoriti current transport/error metadata;
- callback body ne sadrži entitlement, license key, env, putanju ili registry token.

`activeReleaseId` znači isključivo health/reconciliation-verifikovan release koji normalno služi zahteve; nije sinonim za filesystem/service pointer. `observedServicePointerReleaseId` je zaseban best-effort dokaz onoga na šta pointer pokazuje čak i u restricted/unavailable stanju. Dozvoljene kombinacije su tačno:

| status | finalPhase | runtimeStatus | activeReleaseId | observed pointer | buildId | migrationLedgerHash | terminalEvidenceKind | errorClass/code |
|---|---|---|---|---|---|---|---|---|
| succeeded | ready | ready | desired `releaseId` | desired `releaseId` | non-null | non-null | reconciliation_receipt | oba null |
| failed | rejected_before_switch | ready | prethodni verified ID | isti prethodni ID | null ili non-null | null | no_mutation_receipt | non-null class/code |
| failed | rejected_before_switch | not_installed | null | null | null ili non-null | null | no_mutation_receipt | non-null class/code |
| failed | rolled_back | ready | prethodni verified ID, non-null | isti prethodni ID | non-null | non-null | recovery_receipt | non-null class/code |
| failed | maintenance_required | maintenance | null | desired/prethodni/null prema stvarnom pointeru | non-null | non-null | recovery_receipt | `incident` + non-null code |
| failed | rollback_failed | unavailable | null | desired/prethodni/null prema stvarnom pointeru | non-null | non-null | recovery_receipt | `incident` + non-null code |

`migrationLedgerHash` je hash trenutnog verified migration ledgera kada je addon-schema mutation faza započela, čak i ako nije dodala novi red. `rejected_before_switch` je strogo pre prvog addon-schema, service ili pointer write-a; fenced control-plane phase/error redovi `installed|migration_pending|failed` mogu postojati i ne pretvaraju taj rezultat u rollback, ali hash ostaje null.

Za tu granu worker pre callbacka durable zamrzava strict RFC 8785/JCS `NoMutationTerminalEvidenceV1`: `{contractVersion:1,purpose:"addon_deployment_no_mutation",operationId,workerJobId,targetProfile,installationId,installationDeploymentEpoch,generation,releaseId,preOperationServingStateHash,preOperationMigrationLedgerHash,cmsControlPlanePhase:"install_pending|installed|migration_pending",addonSchemaMutationStarted:false,serviceMutationStarted:false,pointerMutationStarted:false,observedActiveReleaseId,observedServicePointerReleaseId,lastCompletedWorkerPhase}`. `lastCompletedWorkerPhase` je closed `accepted|source_exported|root_verified|cache_verified|offline_installed|built|db_preflight`; release ID polja su canonical UUID ili JSON null prema tabeli. Za `rejected_before_switch` callback `noMutationEvidence` nosi ovaj exact objekat i `terminalEvidenceKind=no_mutation_receipt`; `terminalEvidenceHash` je SHA-256 njegovih JCS bytes sa `sha256:` prefiksom. Za preostale četiri finalPhase vrednosti `noMutationEvidence` mora biti JSON null, a CMS nalazi svoj lokalni reconciliation/recovery receipt po operation/job/kind i recompute-uje hash.

CMS hashira primljeni no-mutation objekat i uvek proverava oba pre-operation hash-a prema immutable historical operation/outbox snapshotu. Samo ako je operation još current, pod installation transaction fence-om dodatno recompute-uje i zahteva da current serving/ledger i control-plane stanje još odgovaraju tim hash-evima, čuva evidence i sme postaviti operation `failed`/sanitizovan error. Ako je operation stale, newer current serving tuple se ne poredi sa starim snapshotom niti menja; validan historical receipt se samo auditira i dobija stale ACK. Mismatch historical bindinga je incident. Callback nikada ne upisuje serving tuple/runtime.

Kod success-a `terminalEvidenceKind=reconciliation_receipt` i hash odgovara finalnom readiness receipt-u; callback samo potvrđuje rezultat. Kod rolled-back/maintenance/unavailable rezultata `terminalEvidenceKind=recovery_receipt` odgovara fenced recovery receipt-u koji je već postavio stvarno stanje. Callback nikada nije drugi installed/current writer. Svaka druga kind/hash/tuple kombinacija je `400 invalid_result_tuple`; shared fixture obuhvata sve redove, no-mutation receipt i bar jednu pogrešnu vrednost svake kolone.

Authenticated HTTP 200 ACK body je tačno:

```json
{
  "version": 2,
  "resultId": "<UUID>",
  "operationId": "<UUID>",
  "installationDeploymentEpoch": "10",
  "generation": 1,
  "ack": "applied|duplicate|stale_installation_ignored|stale_epoch_ignored|stale_generation_ignored"
}
```

`applied` znači da je canonical result binding trajno prihvaćen, odgovarajući reconciliation/recovery/no-mutation terminal evidence potvrđen i current transport/operation metadata zatvoren; ne znači drugi installed/current write. Prvi prihvaćeni poziv nikada ne vraća `duplicate`: vraća `applied` ili tačno jedan stale ACK i tu vrednost čuva kao `initial_ack`. `duplicate` se vraća samo za exact replay već prihvaćenog body-ja; identiteti u odgovoru ostaju isti, a auditovani `initial_ack` objašnjava da li je original bio applied ili stale. Bilo koji od tri stale ACK-a samo vezuje rezultat za historical operation/audit i ne mutira current stanje. `stale_installation_ignored` ima prioritet nad numeričkim epoch/generation poređenjem. Error body je strict `{version:2,error:{code,message,requestId,retryable}}`: schema/tuple `400 invalid_schema|invalid_result_tuple`; auth `401 invalid_auth`; isti result ID/drugi body ili isti operation/job sa drugim canonical rezultatom `409 result_binding_conflict`; rate limit `429`; privremena DB greška `503`; neočekivano `500`. Samo `429/503/500` imaju `retryable=true`. Svaki response je HMAC-potpisan prethodno definisanim response contractom.

Worker result outbox završava tek kada verifikuje response HMAC, HTTP 200, isti result/operation/epoch/generation i jedan od pet ACK-a. `400/401/409` ne hot-loopuje već ide u incident/DLQ; `429/503/500` retry-uje isti result ID i exact body. Gubitak 200 odgovora zato daje `duplicate`, a stale callback je bezbedno terminalno potvrđen.

Worker ima sopstveni result outbox/lease/retry/DLQ i ne proglašava job operativno zaključenim dok CMS ne potvrdi callback. Gubitak odgovora ponavlja isti `resultId`/body. CMS recovery job može ponovo procesirati već primljeni durable result, ali u prvom contractu ne postoji drugačiji polling wire protokol.

`cms_addon_installations.status` opisuje poslednju desired operaciju/reconciliation (`failed` je validan posle neuspelog update-a), dok `runtime_status` opisuje poslednje terminalno potvrđeno serving stanje. Sama vrednost `runtime_status=ready` nije dovoljan public gate. Storefront/runtime zahteva validan entitlement, exact trenutno učitani `releaseId/buildId/artifact` jednak promovisanom `installed*` tuple-u, immutable success/recovery receipt koji taj serving tuple potvrđuje i odsustvo aktivnog `cms_addon_serving_fences` reda. Aktivni serving fence ima prioritet čak i za same-release redeploy; prethodni receipt tada nije dovoljan. Pre commita serving fence-a stari verified release može normalno da služi. Zato candidate binarka nikada ne nasleđuje stari `ready`, a uspešan rollback postaje dostupan tek kada recovery receipt atomarno razreši fence i potvrdi vraćeni prethodni tuple. Initial install failure bez prethodnog release-a ostavlja `runtime_status=not_installed` i addon nedostupan. Ne uvoditi dvosmisleni `rollback_ready` status.

## 6. Worker target konfiguracija

Worker ima statičku mapu, na primer:

    vendor route:
      request auth verifier keys: <VENDOR_REDEPLOY_ACTIVE_PLUS_OLD_KID_MAP_SECRET_REF>
      license environment: development
      source mirror: <TRUSTED_CMS_MIRROR>
      allowed CMS SHA: <PINNED_CMS_GIT_SHA>
      expected runtime/core-schema descriptor: <VERSIONED_STATIC_POLICY>
      releases: D:\nr_deploy\vendor\releases
      current: D:\nr_deploy\vendor\current
      runtime env: D:\nr_cms-vendor\.env
      public build env: D:\nr_runtime\worker\build-env\vendor.json
      public build env SHA-256: <PINNED_BUILD_ENV_SHA256>
      migration credential broker mode: os_secret_ref_local
      migration credential secret ref: nr-addon-worker/vendor/webshop-db-deployer
      migration database identity: 127.0.0.1:5432/nr_cms_vendor_test + <RESOURCE_ID>
      migration privilege manifest SHA-256: <PINNED_PRIVILEGE_MANIFEST_SHA256>
      release public keyset: D:\nr_runtime\trust\webshop-release-public-keys.json
      release keyset SHA-256: <PINNED_RELEASE_KEYSET_SHA256>
      master release evidence base URL: https://license.nr.test/.well-known/nr-addon-releases
      service adapter: windows_scm_winsw_v1
      service name/SID: NRVendorCms / NT SERVICE\NRVendorCms
      service wrapper/config/launcher absolute paths + SHA-256: <PINNED_VENDOR_VALUES>
      node executable absolute path + SHA-256: <PINNED_NODE_VALUES>
      service stop/start timeouts: 60s / 90s
      liveness URL: https://vendor.nr.test/api/health/live
      readiness URL: https://vendor.nr.test/api/health/ready
      result callback URL: https://vendor.nr.test/api/internal/addons/deployment-results
      result auth signer active+old keys: <VENDOR_RESULT_ACTIVE_PLUS_OLD_KID_MAP_SECRET_REF>
      package allowlist: @radomirradojevic/webshop

    client route:
      request auth verifier keys: <CLIENT_REDEPLOY_ACTIVE_PLUS_OLD_KID_MAP_SECRET_REF>
      license environment: development
      source mirror: <TRUSTED_CMS_MIRROR>
      allowed CMS SHA: <SAME_PINNED_CMS_GIT_SHA>
      expected runtime/core-schema descriptor: <SAME_VERSIONED_STATIC_POLICY>
      releases: D:\nr_deploy\client\releases
      current: D:\nr_deploy\client\current
      runtime env: D:\nr_cms-client\.env
      public build env: D:\nr_runtime\worker\build-env\client.json
      public build env SHA-256: <PINNED_BUILD_ENV_SHA256>
      migration credential broker mode: os_secret_ref_local
      migration credential secret ref: nr-addon-worker/client/webshop-db-deployer
      migration database identity: 127.0.0.1:5432/nr_cms_client_test + <RESOURCE_ID>
      migration privilege manifest SHA-256: <PINNED_PRIVILEGE_MANIFEST_SHA256>
      release public keyset: D:\nr_runtime\trust\webshop-release-public-keys.json
      release keyset SHA-256: <SAME_PINNED_RELEASE_KEYSET_SHA256>
      master release evidence base URL: https://license.nr.test/.well-known/nr-addon-releases
      service adapter: windows_scm_winsw_v1
      service name/SID: NRClientCms / NT SERVICE\NRClientCms
      service wrapper/config/launcher absolute paths + SHA-256: <PINNED_CLIENT_VALUES>
      node executable absolute path + SHA-256: <PINNED_NODE_VALUES>
      service stop/start timeouts: 60s / 90s
      liveness URL: https://client.nr.test/api/health/live
      readiness URL: https://client.nr.test/api/health/ready
      result callback URL: https://client.nr.test/api/internal/addons/deployment-results
      result auth signer active+old keys: <CLIENT_RESULT_ACTIVE_PLUS_OLD_KID_MAP_SECRET_REF>
      package allowlist: @radomirradojevic/webshop

Body ne sme menjati ovu mapu.

### 6.1 Target DB credential lease contract

Broker contract i provisioning su zaključani u dokumentu 02. Posle uspešnog secret-free download/verification/build gate-a orchestrator preko local capability-authenticated DB brokera pokreće job-private long-lived `db-phase-controller` pod exact `NT SERVICE\NRAddonDbCredentialBroker` identity-jem, ne pod worker/build SID-em; controller poziva `acquireMigrationLeaseV1()`. Ulaz su statički target i durable operation tuple, nikada request-provided host/database/username/secret ref. Local adapter sam razrešava DPAPI `LocalMachine` sealed ref čiji ACL dozvoljava samo DB-broker SID/SYSTEM/Administrators i controlleru daje phase-only credential; parent dobija samo redigovani lease/database/resource/fingerprint metadata.

Controller otvara jednu dedicated PostgreSQL session konekciju, proverava expected host/database/resource ID i `migrationPrivilegeManifestSha256`, postavlja redigovani `application_name=nr-addon:<target>:<operationId>`, uzima exact installation advisory lock i drži istu konekciju kroz phase writes, migracije, pointer/switch fence receipts, reconciliation, bounded final readiness i terminalni success/rollback/maintenance receipt. Parent i controller koriste ACL-zaključan job-private named pipe koji dozvoljava samo orchestrator + DB-broker SID, eksplicitno odbija build/registry SID i koristi broker-izdat non-inheritable one-time channel key, monotonic sequence/HMAC frame-ove i closed command schema-u iz dokumenta 02; proizvoljan SQL/path/command nije dozvoljen. Credential, `PG*` vrednosti i connection string nisu CLI argument, env parenta, pipe payload ni durable zapis. Novi pool/reconnect unutar mutation window-a je zabranjen; recovery posle prekida uzima novu lease/konekciju i prvo radi fenced state/pointer/ledger inspection.

Controller nema registry/HMAC/Clerk/payment/email tajne. Lease metadata bez username/passworda ulazi u phase evidence. `finally` tek posle terminalne odluke zatvara konekciju/controller i release-uje lease; gubitak pipe-a/session-a/lease-a odmah prekida novu mutaciju. Local static-secret i production dynamic-credential adapteri koriste isti interface i error enum `credential_unavailable|credential_expired_before_mutation` (retryable) odnosno `credential_state_unknown_after_mutation|database_identity_mismatch|privilege_manifest_mismatch` (incident/permanent prema uzroku).

CMS outbox trajno čuva `request_auth_kid` i retry istog payload/body hash-a potpisuje istim KID-em; worker acceptance ledger čuva primljeni KID. Novi active KID koristi se samo za novokreirane operations/results. Planirana rotacija je add-new-everywhere → switch active for new writes → drain/retain old → zero-outstanding + replay/backup retention check → revoke/remove. Stari key se ne uklanja dok bilo koji request/result outbox ili replay response referencira taj KID. Prvi contract ne „spašava” retry prepotpisivanjem starog body-ja novim credentialom.

## 7. Worker algoritam

### 7.1 Accept

1. Verifikuj callback.
2. Atomically persistuj job.
3. Ako operationKey već postoji sa istim request hash-em, vrati postojeći job.
4. Ako isti key ima drugi hash, vrati 409.
5. Vrati 202 pre dugog rada.

### 7.2 Target lock

Worker uzima jedan lock po targetu. Vendor i client mogu se deployovati paralelno; dva vendor release-a ne mogu.

Lease mora imati heartbeat i recovery. Nakon worker crash-a drugi worker može preuzeti tek posle isteka.

### 7.3 Novi release direktorijum

Kreirati:

    D:\nr_deploy\<target>\releases\<job-id>

Iz trusted mirror-a eksportovati statički pinovan `cmsCommitSha` za target. Ne klonirati proizvoljan URL niti uzimati commit iz requesta.

Proveriti da release nema:

    .private
    .env
    node_modules
    .next
    .tmp local authority

Worker ne učitava niti prosleđuje ceo target runtime `.env` tokom bilo koje faze. Statička referenca `D:\nr_cms-vendor\.env` odnosno `D:\nr_cms-client\.env` pripada isključivo target CMS service-manager startu; DB credential broker nema ACL/read pristup tim fajlovima i koristi samo svoj DPAPI-sealed deployer credential plus non-secret, pinovani target config. To su jedine canonical runtime env lokacije iz dokumenta 02; `.env` se nikada ne kopira u immutable release, worker parent, broker payload ili child-process build context.

Exact phase boundary je:

| Faza | Dozvoljen env/secret | Mreža |
|---|---|---|
| source/dependency/package download | minimalan proxy/CA config i samo kratkotrajni GitHub Packages read token za exact npm child | samo allowlisted source mirror, npmjs/GitHub Packages i master evidence endpoint |
| verify/registry generation/build | exact hash-pinovani `CmsPublicBuildEnvV1` iz dokumenta 02 + `NODE_ENV=production`, profile/source/phase konstante, pinned tool paths i release/descriptor IDs; nema DB/private Clerk/payment/email/encryption/HMAC/registry vrednosti | outbound blokiran posle fetch-a |
| DB mutation/migration/reconciliation | phase-scoped lease nad najmanje-privilegovanim target DB credentialom u long-lived DB controlleru, expected DB/resource ID i operation/release/migration context; nema Clerk/payment/email/registry/HMAC tajni | samo target PostgreSQL endpoint |
| service start/runtime | full canonical target env daje service manager direktno novom procesu | normalna target runtime policy |

Build-time env validator mora imati zaseban `NR_CMS_ENV_PHASE=build` contract koji ne zahteva runtime secrets. Worker pre child starta proverava exact JCS file hash, target profile/origin/key allowlist i pravi child env od prazne/minimalne osnovice, ne filtriranjem nasleđenog `process.env`. Vendor i client zato dobijaju različite javne `NEXT_PUBLIC_APP_URL`, Clerk publishable, Turnstile site i Webshop public-base vrednosti; `NODE_ENV` je uvek literal `production`, a build-env hash ulazi u phase evidence. Registry token postoji samo u download child procesu i uklanja se pre verifikacije; migration DB credential ne postoji pre migration faze niti u build logu.

Env/handle čišćenje nije OS authorization granica. Orchestrator radi kao `NRAddonDeploymentWorker` i čita samo odvojeni worker-owned root sa sopstvenim job-DB credentialom i redeploy/result HMAC keyringom; ti handle-i su non-inheritable. Nema pristup registry, target-DB ili CMS-runtime secret root-ovima. Credentialed fetch procese pravi `NRAddonRegistryCredentialBroker`, koji ima samo package-token ref; verifier/install/build rade kao `NRAddonBuildSandbox`, koji nema ACL pristup nijednom secret root-u, DB-u, service-control-u ili broker pipe-u; DB controller radi kao `NRAddonDbCredentialBroker`, koji nema registry token. Build-sandbox host koristi restricted token/AppContainer i Windows Job Object sa `KILL_ON_JOB_CLOSE`, zabranjenim breakaway-em i svim potomcima u istom jobu. Pre produkcionog enable-a canary iz build/verifiera mora dokazati `ACCESS_DENIED` za direktan read svakog sealed blob-a, uključujući worker-owned root, neuspešan `CryptUnprotectData` zato što blob nije čitljiv, odbijen broker-pipe connect i neuspešan detached/breakaway descendant; zatim artifact/log scan potvrđuje da canary tajna ne postoji.

AS-BUILT `npm run deploy:verify` poziva `db:migrate:check` i zato ne pripada non-secret/no-DB build sandboxu. Implementirati `npm run deploy:verify:build` koji radi registry/typecheck/static release provere bez DB konekcije; autoritativni migration dry-run/check ostaje u fazi 7.9 sa broker lease-om. Canary package/test pokušava da pročita poznate DB/private-Clerk/payment/HMAC canary vrednosti i da uradi outbound HTTPS/DNS egress tokom verify/build-a; nijedna vrednost nije prisutna, mrežni poziv pada i log/artifact scan je čist.

### 7.4 Quarantine download i pre-install verifikacija

Worker koristi pinovane Node/npm/`pacote`/`cacache` verzije i nov job-private npm-compatible cacache/quarantine. `NPM_CONFIG_CACHE` nikada nije user/global cache. Exact redosled i secret boundary su:

1. Sačuvaj exact base `package.json` i `package-lock.json` bytes iz statički pinovanog CMS commita i izračunaj `cmsBasePackageJsonSha256` i `cmsBasePackageLockSha256`.
2. Fetch-uj exact master publication-attestation rutu, proveri expected content hash i njen JWS pre poverenja registry identitetu.
3. Credentialed fetch child A kroz pinovani `pacote` preuzima exact root packument i private package tarball u job cacache/quarantine. `NRAddonRegistryCredentialBroker` razrešava statički token ref direktno u one-shot non-inheritable handle/job-private `.npmrc` childa pod registry-fetch identity-jem; plaintext nikada ne vraća orchestratoru. U root-fetch fazi samo taj child dobija token, nema ACL/IPC put do DB secret-a, a parent/build-verifier ga nikada ne nasleđuju. Child je u kill-on-close/no-breakaway Job Object-u. Po izlazu obriši config/handle, ukloni token env i zahtevaj token-canary scan pre sledećeg koraka.
4. Secret-free verifier proverava raw `npmTarballSha256`/`npmTarballIntegrity`, validira celu tar listu/path containment bez write-a, zatim bez izvršavanja koda izvlači u quarantine i proverava:
   - package.json name/version odgovaraju requestu;
   - exact stored `release-manifest.json` hash odgovara `embeddedManifestSha256`;
   - ReleaseManifestPayloadV2 prolazi strict schema/JWS parser i `releaseId` odgovara request/master ID-u;
   - addonKey, package identity, source release vreme i attested published vreme odgovaraju jobu;
   - recomputed artifact inventory SHA, svaki file size/hash i Windows-safe path odgovaraju manifest/job vrednostima;
   - statički release keyset prolazi pinovani SHA-256, chained sequence/schema/status proveru, signing KID je prihvatljiv i Ed25519 potpis validan;
   - exact `release-dependency-lock.json` hash odgovara signed `dependencyLockSha256`, strict Win32/x64 graph je validan i direct ranges su exact;
   - provenance/SBOM hash, subject/release ID, registry package-version ID i policy odgovaraju publication attestation-u;
   - migration descriptors/bundle, capabilities, `supportedLicenseEditions/channel`, CMS/Node/Next/runtime/core/schema compatibility i kompletan migration path prolaze.
5. Iz verified dependency-lock grafa napravi immutable fetch plan sa exact `name@version`, allowlisted registry/resolved URL i expected SRI za svaki addon node. Zasebni registry-broker credentialed fetch child B dobija samo taj plan; zajedno sa fetch-only exact base-lock planom kroz pinovani `pacote` puni job cacache potrebnim packument i content/integrity entry-jima, bez installa/lifecycle-a. Child B koristi isti restricted fetch identity/no-breakaway Job Object, zatvara se, njegov token/user config/handle se uklanjaju i ponavlja se canary scan. Secret-free auditor/install/build zatim rade pod zasebnim `NRAddonBuildSandbox` identity-jem, ne kao ovaj fetch child.
6. Secret-free cache auditor za root, svaki addon node i svaki base-lock node poziva `pacote.manifest` i tarball read sa `{offline:true,cache:<JOB_CACHE>}`; proverava selected name/version, registry namespace, tarball bytes/SRI i addon edge/peer/optional skup prema signed graph-u. Nedostajući packument/content entry, offline cache miss, dodatni addon node ili mismatch je permanent failure. Auditor zamrzava deterministic cache inventory/hash, a install koristi njegovu disposable kopiju.
7. Generiši token-free user config sa samo exact registry mapama `registry=https://registry.npmjs.org/` i `@radomirradojevic:registry=https://npm.pkg.github.com` plus non-secret hardening; `_authToken`, auth header i secret ref su zabranjeni. Postavi pinovani npm CLI, `NPM_CONFIG_USERCONFIG=<TOKEN_FREE_FILE>`, `NPM_CONFIG_CACHE=<VERIFIED_CACHE_COPY>`, `NPM_CONFIG_OFFLINE=true`, `NPM_CONFIG_IGNORE_SCRIPTS=true`, `NPM_CONFIG_AUDIT=false`, `NPM_CONFIG_FUND=false`; skeniraj parent env/config/cache/release/log za credential fingerprint i tek onda OS-level onemogući outbound. Iste registry mape čuvaju identične packument cache key-eve između fetch/offline faze. Svi naredni npm/pacote koraci su offline. Cache entry bez exact base-lock ili signed addon SRI nije validan fallback.

Integrity, signature, identity, schema, policy ili compatibility mismatch u ovoj fazi je `permanent` (odnosno `incident` kada key status ukazuje na kompromitaciju). Čista transportna nedostupnost allowlisted registry/source/master-evidence endpointa pre bilo kakve CMS-state/migration/switch mutacije je `retryable` i ponavlja isti operation/generation; primljeni bytes koji ne prolaze hash/potpis nisu transportna greška.

### 7.5 Offline lock merge i install

Iz proverene npm-compatible cacache kopije, bez credentiala i mreže:

    npm install --package-lock-only --offline --ignore-scripts --save-prod --save-exact @radomirradojevic/webshop@<EXACT_VERSION>

Pre bilo kakvog finalnog installa strict diff sačuvanih exact base `package.json`/`package-lock.json` bytes i merged verzija zahteva:

- base hash odgovara source commitu i nije promenjen između checkova;
- jedina dozvoljena promena base `package.json` objekta je dodavanje exact production dependency-ja `@radomirradojevic/webshop=<EXACT_VERSION>`; scripts, package-manager metadata i sva druga polja/bytes-normalization politika ostaju zaključani;
- svaki novi lock node/edge je reachable iz tog root-a i exact jednak signed dependency graph-u;
- nijedan postojeći core node/edge/version/resolved/integrity/peer context, `lockfileVersion` ili drugi root field nije promenjen ili uklonjen.

Zatim:

    npm ci --offline --ignore-scripts

Worker zatim ponovo auditira install-cache delta: svaki content blob mora imati exact base-lock ili signed-addon SRI, a svaki novi index/packument ključ mora pripadati immutable fetch planu. Trajno beleži `cmsBasePackageJsonSha256`, `cmsMergedPackageJsonSha256`, `cmsBasePackageLockSha256`, `cmsMergedPackageLockSha256`, pinovane tool verzije, packument/cache inventory hash i redigovani deterministic diff summary u phase evidence. Drugačiji npm resolution, offline cache miss, extra/omitted addon node ili bilo koja nedozvoljena base manifest/core-lock promena je permanent supply-chain failure pre CMS DB lease-a, migracije ili switch-a.

### 7.6 Post-install release verifikacija

Pre registry generation/build-a worker ponovo proverava installed bytes, ne samo quarantine kopiju:

1. finalni addon-reachable production graph ima exact signed node/edge/integrity/peer/optional resolution i nema extra node;
2. installed root package i `package-lock` SRI odgovaraju očekivanom tarballu;
3. recomputed installed artifact inventory/manifest/dependency-lock/provenance/SBOM/migration hashes odgovaraju pre-install evidence-u i jobu;
4. package directory nema nedeklarisan fajl, lifecycle output, `.npmrc`, credential ili symlink/link escape;
5. worker-observed descriptor hash i svi CMS/Node/Next/runtime/core/schema/capability/edition/channel gate-ovi i dalje odgovaraju statičkoj target policy i master snapshotu.

Mismatch ostaje permanent/incident po istom zatvorenom error contractu. Ova druga provera ne može da „ozeleni” package koji nije prošao pre-install quarantine gate.

### 7.7 Registry inputs

Worker generiše production registry i public keyset input u release-u. Ne koristi local .tmp registry iz D:\nr_cms.

Pokrenuti:

    npm run addons:registry

### 7.8 Build

Bez package lifecycle scripts:

    npm run deploy:verify:build
    npm run build

Obe komande rade sa exact hash-pinovanim public build-env contractom, `NODE_ENV=production` i blokiranim outboundom. `deploy:verify:build` nema DB proveru; migration dry-run/check iz postojećeg `deploy:verify` premešta se u sledeću fazu posle credential lease-a. Build mora proći pre target DB credential acquire-a, promene baze ili aktivnog servisa.

### 7.9 Migracije

1. Posle uspešnog builda acquire-uj purpose-specific target DB lease iz 6.1, proveri database/resource/privilege identity i otvori jednu dedicated session konekciju.
2. Uzmi exact installation deployment fence lock iz 4.1 i ponovi current operation/epoch/generation/entitlement/desired-release proveru; u V1 jedan CMS DB ima jedan Webshop installation i ne uzima drugi „addonKey” lock drugačijom derivacijom.
3. Na istoj konekciji uradi read-only dry-run, potvrdi očekivani pending set i backup/precondition. Pre acquire-a je release admission već morao dokazati da svaki descriptor ima `destructive=false` i `rollbackPolicy=expand_compatible`; V1 `destructive=true|forward_only` je permanent `unsupported_migration_policy` pre DB lease-a/phase/schema write-a. Ako pending set nije prazan i postoji prethodni currently serving release, pre prvog write-a dodatno zahteva da njegov potpisani `supportedAddonSchemaVersionMin/Max` range uključuje finalnu schema verziju pending seta; mismatch je permanent `unsupported_online_migration`. Initial install sa `runtimeStatus=not_installed` i bez prethodnog serving release-a nema taj old-release uslov: sme da primeni samo verified non-destructive/`expand_compatible` bundle dok addon ostaje public nedostupan. Failure do ovog trenutka je `rejected_before_switch` i nije upisao CMS phase/migration stanje.
4. Prvi CMS write je CAS `status=installed` uz phase evidence za isti operation/epoch/generation. Ovaj status znači „release staged + post-install/build verified”; ne popunjava nijedno `installed*` serving polje i ne menja `runtime_status`.
5. Neposredno pre migration runnera na istoj konekciji CAS-om postavi `status=migration_pending`. I prazan pending set prolazi kroz ovu fazu da writer/state contract ostane isti.
6. Primeni samo potpisane migracije i upiši `cms_addon_migrations`; promenjen checksum je hard failure.
7. Ne oslobađaj DB lease/controller/session advisory lock niti target mutex: isti fenced mutation window traje kroz pointer switch, reconciliation, bounded final readiness i terminalni success ili recovery receipt iz 7.11/9. Ako runner prekine posle jednog ili više schema/ledger write-ova, ali pre `begin_serving_mutation_fence`, recovery pod istim vrstama lockova prvo rekonstruiše stvarni ledger i završava tačno jednim recovery receipt-om; ne pokušava običan retry niti no-mutation klasifikaciju.

Nema progress HTTP callbacka u prvom contractu. Admin UI čita ove durable CMS operation faze koje worker piše isključivo na fenced konekciji. Workerova sopstvena phase-evidence tabela može imati detaljnije download/verify/build korake, ali oni nisu autoritativni CMS `installed/migration_pending` statusi.

Package 0.5.0 nije tranzicioni production release: nema packaged SQL i njegov 13-table model nije ekvivalentan stvarnoj host šemi. Prvi production-eligible release koristi novi canonical baseline iz dokumenta 03. `legacy_applied` je dozvoljen samo posle zasebnog operator cutover-a i exact structural/privilege postconditiona iz nastavka; nikada zato što tabele samo „izgledaju prisutno”.

Update migracije moraju biti expand/backward-compatible sa prethodnim aktivnim release-om; initial install nema prethodni runtime, ali i dalje prihvata samo non-destructive `expand_compatible` descriptor. Prvi contract odbija svaki destructive/forward-only descriptor pre DB write-a; down migracije se ne pokreću automatski.

Crash/failure tokom migration koraka pre nego što serving-fence red postoji ima poseban deterministic recovery. Recovery uzima isti target mutex, novu purpose-scoped DB lease/session konekciju i isti installation advisory lock, pa iz stvarne šeme i `cms_addon_migrations` rekonstruiše koliko je exact signed pending seta commitovano. Ako nema nijednog addon-schema niti ledger write-a, sme da završi `rejected_before_switch` sa no-mutation receipt-om i prethodnim public runtime-om; pošto fence red ne postoji, ne izvršava nikakav fence-resolution CAS. Ako postoji makar jedan schema/ledger write, no-mutation je zabranjen. Recovery tada ili idempotentno nastavlja baš isti verified operation/pending set do normalnog begin-fence/switch/finalizovanja, ili ga terminalizuje recovery receipt-om sa non-null current ledger hashom: `rolled_back` znači da prethodni serving release ostaje/verifikovano radi na kompatibilnoj proširenoj šemi bez down migracije, dok `maintenance_required` važi kada takav prethodni runtime ne postoji ili kompatibilnost/realno stanje nije dokazano. Initial-install partial migration bez prethodnog runtime-a zato ne može biti `rejected_before_switch`; ako se ne može bezbedno nastaviti, završava `maintenance_required`. Ne pokušava se CAS nad nepostojećim serving-fence redom. Fixture ubija runner između dva migration commita i proverava resume-or-one-recovery-receipt odluku, non-null ledger hash i odsustvo lažnog no-mutation receipt-a.

Pre pending-set odluke runner radi schema-qualified classifier iz dokumenta 03. Dozvoljena stanja su: `empty_addon_schema`, exact canonical `webshop` fingerprint sa validnim ledgerom ili exact legacy 45-table `public` fingerprint. Legacy stanje nije normalna addon migracija: worker bez DB/schema/service/pointer write-a završava postojeći tuple `status=failed,finalPhase=rejected_before_switch,errorClass=permanent,errorCode=operator_schema_cutover_required` sa exact no-mutation receipt-om, a UI prikazuje backup/stop/admin CLI runbook. To nije retryable generation+1; posle operator cutover-a isti desired release dobija novi auditovani epoch/intent. Tek posle admin-authorized cutover-a, exact `postconditionSchemaFingerprintSha256`, privilege manifest, row-count/aggregate i owner/ACL dokaz dozvoljavaju idempotentni `legacy_applied` baseline seed. Stari package 13-table `0001`, public+webshop duplikat, missing/extra/drift tabela ili blind seed je incident.

Za empty install signed canonical baseline kreira samo `webshop` schema objekte; host control-plane ostaje `public`. Posle svakog committed descriptor-a controller rekonstruiše strict `WebshopSchemaFingerprintV1` i zahteva descriptorov `postconditionSchemaFingerprintSha256`, zatim fixed grant reconciler proverava target deployer owner, runtime DML i cross-schema `REFERENCES` allowlist pre sledećeg koraka. Raw migration `CREATE/ALTER/DROP SCHEMA`, owner/role/`SET ROLE`/`GRANT|REVOKE`, nequalified ili non-`webshop` business objekat pada pre izvršenja. Finalni phase evidence i terminalni receipt hashuju observed schema fingerprint i privilege-manifest rezultat zajedno sa migration ledgerom; callback ne mora verovati workerovom tekstualnom opisu jer CMS na istoj DB transakciji nezavisno rekonstruiše očekivani fingerprint.

`migrationLedgerHash` u result callbacku je tačno `"sha256:" + lowercaseHex(SHA-256(RFC8785_JCS(MigrationLedgerEvidenceV1)))`, gde je strict objekat bez dodatnih polja:

```json
{
  "contractVersion": 1,
  "purpose": "addon_migration_ledger",
  "addonKey": "webshop",
  "entries": [
    {
      "migrationId": "0001_webshop_core.sql",
      "releaseId": "<CANONICAL_LOWERCASE_UUID>",
      "checksum": "<64_LOWERCASE_HEX>",
      "schemaVersion": 1,
      "status": "applied|legacy_applied"
    }
  ]
}
```

`migrationId` je unique i entries su sortirani po njegovim UTF-8 bytes; release ID, checksum i schemaVersion moraju odgovarati verified signed migration descriptoru odnosno dokazanoj legacy tranziciji. Volatile timestamp, job/actor, duration, error i free-text ne ulaze u hash. Shared fixture zaključava canonical bytes i digest praznog ledgera `{...,"entries":[]}` i jednog reda. Worker računa hash sa iste fenced DB konekcije posle poslednjeg migration write-a; CMS ga u callback transakciji nezavisno rekonstruiše iz svog ledgera i zahteva jednakost.

Za `succeeded+ready`, `failed+rolled_back`, `maintenance_required` i `rollback_failed` hash je non-null i opisuje stvarno trenutno DB ledger stanje — rollback koda ne briše forward migration evidence. `rejected_before_switch` mora nastati pre prvog addon-schema ili `cms_addon_migrations` ledger write-a i šalje `migrationLedgerHash=null`; control-plane `installed|migration_pending` phase write sam po sebi nije schema mutation. Ako schema/ledger write postoji, taj finalPhase je contract violation. Hash se trajno čuva uz worker result, installed evidence za serving release i incident/rollback zapis.

### 7.10 Aktivacija release-a

Worker:

1. na istoj DB konekciji i pod oba locka poziva `begin_serving_mutation_fence`, commit-uje active fence vezan za operation/job/epoch/generation i tek tada dozvoljava service mutation;
2. zaustavlja samo ciljni servis kroz pinovani service adapter;
3. atomically menja current junction/symlink ili service working directory;
4. pokreće novi servis;
5. čeka bounded startup;
6. proverava liveness/build health: proces, build ID, addon module/manifest i DB connectivity, ali još ne zahteva lokalni status `ready`;
7. izvršava non-serving candidate reconciliation iz odeljka 7.11, dok DB controller/session lock i target mutex ostaju aktivni;
8. preko internal-auth/loopback candidate-health rute proverava bounded readiness željenog učitanog Webshop release-a; javni addon gate u ovoj fazi namerno ostaje restricted zbog active serving fence-a;
9. ako candidate health prođe, na istoj fenced DB konekciji u jednoj transakciji promoviše candidate serving tuple, finalizuje immutable success receipt i razrešava serving fence; ako padne, bez otpuštanja ijednog locka ulazi u rollback/maintenance odluku iz odeljka 9;
10. ne smatra redirect/login HTML health rezultatom i tek posle terminalnog receipt/fence-resolution commita oslobađa DB lease/controller i target mutex.

Koraci 2–4 koriste isključivo `WindowsScmCmsServiceAdapterV1` iz dokumenta 02 i statički target zapis. Pre stop-a `inspectV1()` mora potvrditi exact service name/SID, SCM state, PID zajedno sa process-start vremenom, loaded `current` targetom, wrapper/config/launcher i `node.exe` hashom, kao i očekivanim loopback portom. `stopV1()` zaustavlja samo mapirani SCM servis, čeka `STOPPED` najviše 60 sekundi i nema `taskkill`, PID-only kill ili fallback command; pointer se menja tek nakon tog dokaza. `startV1()` pokreće isti literal service name i `waitForStateV1()` najviše 90 sekundi dokazuje novi PID/start vreme i da učitani current/release/build tuple odgovara očekivanom release-u pre HTTPS health-a.

Deployment request, addon package i mutable job payload ne mogu da izaberu service name, SID, executable, XML/launcher, working directory, env fajl, port, command ili timeout. Hash/DACL drift, PID reuse, neočekivani auto-restart između stop-a i pointer switch-a, proces koji nije potomak pinovanog wrappera, pogrešan loaded current target ili timeout je incident i prekida novu mutaciju; recovery ostaje pod active serving fence-om dok ne upiše terminalni receipt. `npm run dev`, terminalom pokrenut `next dev` i proizvoljan checkout proces nisu managed deployment target i ne mogu zadovoljiti ovaj contract.

### 7.11 Reconciliation

Posle liveness provere glavni managed tok ne pokreće drugi CLI/HTTP writer sa novom DB konekcijom. Long-lived DB controller na istoj dedicated konekciji koja i dalje drži installation advisory fence poziva versionirani shared `reconcileAddonCandidateOnConnectionV1(connection,input)` contract koji:

- ponovo verifikuje lokalni entitlement;
- učita installed manifest;
- poredi desired i installed release ID, package name/version, npm tarball integrity, artifact hash i signing KID;
- proveri migration ledger;
- proveri runtime capability;
- compare-and-swap proveri deployment epoch/intent/generation/operation i izvrši sve semantic reconcile provere bez promene serving autoriteta;
- u zasebnu `cms_addon_deployment_candidates` tabelu upiše unique non-serving evidence `(operationId,workerJobId,epoch,generation,candidateReleaseId,candidatePackageVersion,candidateArtifactSha256,candidateBuildId,migrationLedgerHash,candidateTupleHash,candidateStatus='reconciled',candidateCommittedAt,terminalReceiptId=null)`;
- ne menja `installed*`, current serving tuple, `readyAt`, `status=ready` niti `runtime_status=ready`; candidate red bez terminalnog receipt-a nikada nije dovoljan runtime dokaz.

Posle candidate commita orchestrator i dalje drži target mutex, a controller istu DB session/advisory konekciju i broker lease. Worker poziva isključivo internal-auth/loopback `candidate-ready` proveru sa hard deadline-om kraćim od lease safety margin-a. Ruta proverava exact učitani build/release/artifact, DB connectivity i candidate tuple, ali ne čita niti postavlja public `ready` i nije dostupna kroz obični Caddy/public origin bez worker autentifikacije.

Ako provera prođe, controller poziva `finalizeAddonReadyReceiptOnConnectionV1`. Taj helper ponovo CAS-proverava operation/current/candidate/entitlement/ledger/pointer evidence i exact active serving-fence binding, pa u jednoj DB transakciji: kopira candidate tuple u `installed*`/current serving polja, postavlja `status=ready`, `runtime_status=ready`, `deployedAt/reconciledAt/readyAt`, upisuje immutable reconciliation receipt `(operationId,workerJobId,epoch,generation,installedTupleHash,migrationLedgerHash,buildId,readinessEvidenceHash,committedAt)`, vezuje njegov ID za candidate i CAS-om menja serving fence `active -> resolved_success`. Ovo je jedini success writer serving tuple-a i `ready`; activation, candidate helper, health ruta i result callback to nikada ne rade. Public gate može postati true tek posle ovog atomarnog commita i samo ako proces koji prima zahtev zaista ima isti loaded tuple.

Ako candidate readiness padne ili je neodređen, success receipt se ne kreira niti se candidate promoviše; pod istim DB session lockom i target mutexom odmah se izvršava kompatibilni rollback ili maintenance/rollback-failed recovery iz odeljka 9, zatvara candidate i u jednoj transakciji upisuje tačno jedan recovery receipt plus `active -> resolved_recovery` serving-fence CAS. Failure posle begin-fence commita ali pre prve stvarne service/pointer mutacije sme koristiti exact lokalni no-mutation receipt i `active -> resolved_no_mutation` samo ako je pending migration set bio prazan i nije postojao nijedan addon-schema ili migration-ledger write (`addonSchemaMutationStarted=false`, result ledger hash null). Ako je non-empty expand-compatible migracija već primenjena, isti pre-service failure mora imati recovery receipt i non-null current ledger hash: `rolled_back` kada stari loaded release svojim signed schema range-om podržava novu šemu, inače `maintenance_required`; nikada se lažno ne klasifikuje kao no-mutation. Tek posle jednog terminalnog receipt/fence-resolution commita zatvaraju se controller/konekcija/lease i target mutex. Ako worker/controller/konekcija padne pre toga, PostgreSQL automatski oslobađa lock, ali job ostaje non-terminalan i public gate ostaje restricted zbog durable active fence-a. Recovery istog operation-a pod novim target mutexom i DB lease/lock-om prvo poredi serving fence, candidate, DB/pointer/migration ledger i internal candidate health, pa idempotentno finalizuje isti success/recovery/no-mutation ishod. Test ubija worker odmah posle begin-fence commita sa praznim i non-empty pending setom, posle switch-a, posle candidate reconciliation-a, između readiness-a i promotion commita, uključujući same-release redeploy, i dokazuje jednu terminalnu odluku bez paralelnog writer-a ili candidate-serving prozora.

Manual recovery CLI može postojati:

    npm run addons:reconcile -- --addon=webshop --operation-id=<UUID>

CLI mora sam uzeti isti exact installation fence, zahtevati operation/epoch/generation i biti idempotentan; nije pozvan dok worker drži lock i ne sme štampati entitlement ili secret. Internal HTTP reconciliation writer nije deo prvog contracta.

## 8. Health contract

Razdvojiti liveness/build dokaz od finalne addon readiness provere, na primer:

    GET /api/health/live
    GET /api/health/ready

Liveness response pre reconciliation-a:

    {
      "ok": true,
      "buildId": "<ID>",
      "cmsCommitSha": "<SHA>",
      "database": "reachable",
      "addonsLoaded": {
        "webshop": {
          "packageVersion": "<VERSION>",
          "artifactSha256": "<SHA>"
        }
      }
    }

Internal candidate-readiness response posle non-serving reconciliation-a:

    {
      "ok": true,
      "buildId": "<ID>",
      "cmsCommitSha": "<SHA>",
      "database": "reachable",
      "addons": {
        "webshop": {
          "status": "candidate_ready",
          "packageVersion": "<VERSION>",
          "artifactSha256": "<SHA>"
        }
      }
    }

Ne vraćati installation ID, entitlement ID, domain listu, key fingerprint ili secrets na javnim health rutama. Candidate response iznad je internal-auth/loopback-only i worker proverava njegov exact operation/release/build binding; public readiness ga nikada ne koristi kao serving dozvolu. Public readiness opisuje samo trenutno učitani tuple koji se tačno poklapa sa atomarno promovisanim `installed*` evidence-om i terminalnim receipt-om. Ako current pokušaj ima pointer/service mutation bez svog terminalnog receipt-a, public Webshop readiness je false čak i kada stari DB `runtime_status` još glasi `ready`. Posle zdravog rollback-a može opet biti `ok=true` za stari release tek po commitu recovery receipt-a, dok admin vidi failed desired update. Redosled je obavezno `start -> live/build/addon-loaded -> reconcile candidate -> internal candidate-ready -> atomic promote+receipt -> public ready`; public readiness ne sme biti preduslov za operaciju koja ga tek postavlja.

## 9. Rollback workera

Ako start/liveness/reconciliation/final-readiness padne, worker ne otpušta target mutex, DB controller/session lock ili lease pre sledeće odluke:

1. ne menjati desired entitlement;
2. na istoj fenced DB konekciji označiti novi install attempt failed;
3. vratiti prethodni current release samo ako je schema-compatible;
4. pokrenuti prethodni servis;
5. proveriti health i pozvati fenced rollback-reconciliation; ako prođe, taj contract na istoj konekciji čuva `status=failed`, `runtime_status=ready`, prethodni installed tuple/current evidence i immutable recovery receipt za result `finalPhase=rolled_back`;
6. zabeležiti failure code;
7. ostaviti package data netaknuta;
8. ne pokretati down migracije;
9. tek posle immutable recovery receipt commita zatvoriti DB controller/session/lease i target mutex, pa enqueue-ovati canonical result callback.

Ako nova migracija nije kompatibilna sa prethodnim package-om, automatski binary rollback je zabranjen; fenced recovery writer postavlja `runtime_status=maintenance`, `finalPhase=maintenance_required`, durable recovery receipt, ostavlja core u restricted modu i traži forward-fix. Ako pokušaj kompatibilnog rollback-a sam padne, isti fenced recovery contract postavlja `runtime_status=unavailable`, `finalPhase=rollback_failed` i incident runbook. Initial activation failure pre addon-schema/pointer write-a je `rejected_before_switch/not_installed` (ili zadržava prethodni `runtime_status=ready` kod update-a). Result callback u sva tri slučaja proverava receipt i zatvara transport; ne menja installed/current/runtime stanje.

## 10. UI ponašanje

Activation forma treba da prikaže:

    License accepted
    Deployment queued
    Installing package
    Applying migrations
    Verifying deployment
    Ready

Ne prikazivati generički success odmah nakon master odgovora.

Admin stranica treba da prikaže:

- operation ID;
- deployment intent i generation;
- desired package version;
- poslednju fazu;
- bezbedan error code/message;
- retry status;
- vreme poslednjeg pokušaja;
- dugme Reconcile;
- dugme Retry samo za dokazano terminalnu retryable grešku. Klik pod CAS lock-om kreira sledeću generation/operation vezanu `supersedes` referencom; ne requeue-uje job čiji je rezultat samo nepoznat.

## 11. Deactivation i update

Deactivation:

- potpisan PoP zahtev masteru;
- activation status deactivated;
- lokalni addon disabled;
- package i podaci ostaju;
- activation slot se oslobađa;
- nove prodajne/kreacione operacije se gase;
- postojeće obaveze mogu se završiti prema policy-ju.

Update:

    ready -> update_pending -> installed -> migration_pending -> ready

Worker mora dobiti novi immutable release ID/hash i zasebnu update authorization odluku. Ne koristiti npm latest.

## 12. Obavezni testovi

Unit/contract:

- HMAC valid/invalid;
- unknown KID;
- timestamp skew;
- replay request ID;
- body tamper;
- wrong route;
- package name/range rejection;
- local-dev release KID rejection;
- request hash conflict;
- isti activation/dispatch retry ostaje u istoj generaciji;
- terminal failed + Retry kreira tačno sledeću generaciju, dok unknown/callback-timeout i succeeded ne mogu;
- late callback superseded generacije ne menja current desired/runtime/installed stanje;
- maintenance/rollback-failed nemaju običan requeue pre audited incident clearance-a;
- state transition invariants.

Integration:

- activation transakcija postoji pre enqueue-a;
- worker 202 job ID se čuva;
- worker crash/lease recovery;
- GitHub Packages install u čistom checkoutu;
- package tamper;
- missing migration payload;
- failed migration;
- failed build;
- failed health;
- rollback;
- post-deploy ready reconciliation;
- vendor/client target isolation.

E2E:

    valid key -> install_pending -> worker job -> ready

i:

    invalid key -> nema install joba
    valid key + registry outage -> retry, stari release radi
    valid key + tampered package -> permanent failed, nema switch-a
