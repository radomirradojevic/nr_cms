import type {
  CatalogRequestV2,
  CatalogResultV2,
  CustomerLicenseIssuerJsonObjectV2,
  CustomerLicenseIssuerV2,
  IssuerDescriptorV2,
  IssueCommandV2,
  LifecycleCommandV2,
  LicenseReceiptV2,
  OperationAcceptedV2,
  OperationQueryV2,
  OperationResultV2,
} from "@nr-cms/addon-sdk/customer-license-issuer-v2";

type JsonPrimitive = boolean | null | number | string;
type IsJsonSerializable<T> = T extends undefined
  ? true
  : T extends JsonPrimitive
    ? true
    : T extends CustomerLicenseIssuerJsonObjectV2
      ? true
      : T extends readonly (infer Item)[]
        ? IsJsonSerializable<Item>
        : T extends (...args: never[]) => unknown
          ? false
          : T extends object
            ? false extends {
                [Key in keyof T]-?: IsJsonSerializable<T[Key]>;
              }[keyof T]
              ? false
              : true
            : false;
type Expect<T extends true> = T;

export type DescriptorIsJsonFixture = Expect<
  IsJsonSerializable<IssuerDescriptorV2>
>;
export type CatalogRequestIsJsonFixture = Expect<
  IsJsonSerializable<CatalogRequestV2>
>;
export type CatalogResultIsJsonFixture = Expect<
  IsJsonSerializable<CatalogResultV2>
>;
export type IssueCommandIsJsonFixture = Expect<
  IsJsonSerializable<IssueCommandV2>
>;
export type LifecycleCommandIsJsonFixture = Expect<
  IsJsonSerializable<LifecycleCommandV2>
>;
export type OperationAcceptedIsJsonFixture = Expect<
  IsJsonSerializable<OperationAcceptedV2>
>;
export type OperationQueryIsJsonFixture = Expect<
  IsJsonSerializable<OperationQueryV2>
>;
export type OperationResultIsJsonFixture = Expect<
  IsJsonSerializable<OperationResultV2>
>;
export type ReceiptIsJsonFixture = Expect<IsJsonSerializable<LicenseReceiptV2>>;

export const issuerDescriptorV2Fixture = {
  algorithms: ["EdDSA"],
  apiVersions: ["1", "2"],
  assertionTypes: ["NRC-CUSTOMER-LICENSE+JWT"],
  contractVersion: "2",
  environment: "test",
  issuer: "urn:nrc:customer:cms-fixture",
  issuerRef: "cms-fixture",
  keysetRevision: 1,
  keysetUrl: "/api/license-server/v2/keys",
  status: "active",
} satisfies IssuerDescriptorV2;

export const catalogRequestV2Fixture = {
  contractVersion: "2",
  ifNoneMatch: '"catalog-7"',
} satisfies CatalogRequestV2;

export const catalogResultV2Fixture = {
  catalog: {
    environment: "test",
    etag: '"catalog-7"',
    issuerRef: "cms-fixture",
    products: [
      {
        audience: "urn:example:desktop",
        name: "Example Desktop",
        productTypeRef: "example-desktop",
        profiles: [
          {
            allowedClaimSources: ["customer.externalRef"],
            audience: "urn:example:desktop",
            claimSchema: {
              hash: "sha256:fixture",
              id: "desktop-claims",
              version: "2.0.0",
            },
            delivery: {
              licenseKey: true,
              offlineFile: true,
              signedAssertion: true,
            },
            features: ["projects"],
            licenseType: "subscription",
            limits: { maxProjects: 25 },
            profile: { revision: 7, sku: "desktop-pro" },
            status: "published",
          },
        ],
      },
    ],
    revision: 7,
  },
  contractVersion: "2",
  status: "ok",
} satisfies CatalogResultV2;

export const issueCommandV2Fixture = {
  claimInput: { edition: "pro", maxProjects: 25 },
  contractVersion: "2",
  customer: {
    displayName: "Example Company",
    externalRef: "customer-1",
  },
  idempotencyKey: "webshop:order-item:item-1:issue",
  productTypeRef: "example-desktop",
  profile: { revision: 7, sku: "desktop-pro" },
  source: {
    orderItemRef: "item-1",
    orderRef: "order-1",
    system: "webshop",
  },
} satisfies IssueCommandV2;

export const licenseReceiptV2Fixture = {
  assertion: "header.payload.signature",
  claimSchema: {
    hash: "sha256:fixture",
    id: "desktop-claims",
    version: "2.0.0",
  },
  expiresAt: null,
  id: "receipt-1",
  issuedAt: "2026-08-15T12:00:00.000Z",
  issuerRef: "cms-fixture",
  licenseKey: "NRLS-FIXTURE-REVEAL-ONCE",
  licenseKeyMasked: "NRLS-****-ONCE",
  licenseId: "license-1",
  profile: { revision: 7, sku: "desktop-pro" },
} satisfies LicenseReceiptV2;

export const operationAcceptedV2Fixture = {
  contractVersion: "2",
  operation: {
    id: "operation-1",
    receipt: licenseReceiptV2Fixture,
    status: "succeeded",
  },
} satisfies OperationAcceptedV2;

export const lifecycleCommandV2Fixture = {
  action: "revoke",
  contractVersion: "2",
  effectiveAt: "2026-08-15T13:00:00.000Z",
  idempotencyKey: "webshop:order-item:item-1:refund",
  licenseRef: { sourceOrderItemRef: "item-1", sourceSystem: "webshop" },
  newExpiresAt: null,
  reason: "refund",
} satisfies LifecycleCommandV2;

export const customerLicenseIssuerV2Fixture = {
  contractVersion: "2",
  async catalog() {
    return catalogResultV2Fixture;
  },
  async describe() {
    return issuerDescriptorV2Fixture;
  },
  async enqueueIssue() {
    return operationAcceptedV2Fixture;
  },
  async enqueueLifecycle() {
    return operationAcceptedV2Fixture;
  },
  async getOperation() {
    return operationAcceptedV2Fixture;
  },
} satisfies CustomerLicenseIssuerV2;

export const validJsonObjectV2Fixture = {
  nested: { enabled: true, values: [1, "two", null] },
} satisfies CustomerLicenseIssuerJsonObjectV2;

export const invalidVersionV2Fixture = {
  // @ts-expect-error V2 commands cannot be compiled with a V1 discriminator.
  contractVersion: "1",
  customer: { externalRef: "customer-1" },
  idempotencyKey: "fixture",
  productTypeRef: "product",
  profile: { revision: 1, sku: "sku" },
  source: { system: "fixture" },
} satisfies IssueCommandV2;

export const invalidJsonObjectV2Fixture = {
  // @ts-expect-error Date instances are not JSON values in the public contract.
  createdAt: new Date(),
} satisfies CustomerLicenseIssuerJsonObjectV2;
