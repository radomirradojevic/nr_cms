# Deljeni remediation contract-i

Ovaj direktorijum sadrži redigovane, verzionisane schema/test-vector artefakte. Runtime implementacija je i dalje u projektima; `@nr-cms/addon-sdk` sada postoji kao lokalni package, dok poseban `@nr-cms/vendor-license-contracts` package još nije izdvojen.

- `vendor-license/v1/` — stvarni Webshop ↔ centralni Vendor License Service V1/HMAC V2 fixture-i koje testovi učitavaju.
- `vendor-license-contract/v1/` — legacy planirana putanja; sada upućuje na stvarnu `vendor-license/v1/` lokaciju.
- `addon-sdk/v1/` — dokumentacioni contract za lokalni `packages/addon-sdk` V1; puna compatibility vector matrica još nedostaje.

Svaka buduća faza mora menjati schema-u i njen test vector u istom patch-u. Duplirani TypeScript interfejsi u privatnim repozitorijumima nisu zamena za ove artefakte.
