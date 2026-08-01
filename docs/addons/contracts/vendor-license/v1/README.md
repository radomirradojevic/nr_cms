# Vendor License API contract V1

The HTTP namespace remains `/api/v1`; the authentication scheme is `NRLS-HMAC-V2`.
`contractVersion: 1` is the payload version. The distinction prevents a URL rename
from silently changing signed payload semantics.

The files in `test-vectors/` are redacted, deterministic contract fixtures shared by
the central service and Webshop. They contain no credentials or usable license keys.

- `hmac-v2.json`: canonical request and signature input/output.
- `catalog-response.json`: catalog shape accepted by the Webshop consumer.
- `issue-request.json`, `validate-request.json`, `lifecycle-requests.json`: mutation payloads.
- `idempotency.json`: replay and conflict semantics.

All mutation requests require a unique `Idempotency-Key`, included in the HMAC
canonical string. `licenseKey` is returned only by issue/replay responses and is not
permitted in audit metadata or test snapshots.
