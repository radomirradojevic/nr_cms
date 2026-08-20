export type CustomerLicenseIssuerContractVersionV2 = "2";

export type CustomerLicenseIssuerJsonPrimitiveV2 =
  | boolean
  | null
  | number
  | string;

export type CustomerLicenseIssuerJsonValueV2 =
  | CustomerLicenseIssuerJsonPrimitiveV2
  | CustomerLicenseIssuerJsonObjectV2
  | readonly CustomerLicenseIssuerJsonValueV2[];

export type CustomerLicenseIssuerJsonObjectV2 = {
  readonly [key: string]: CustomerLicenseIssuerJsonValueV2;
};

export type CustomerLicenseIssuerEnvironmentV2 =
  | "development"
  | "production"
  | "staging"
  | "test";

export type LicenseProfileRefV2 = {
  readonly revision: number;
  readonly sku: string;
};

export type ClaimSchemaRefV2 = {
  readonly hash: string;
  readonly id: string;
  readonly version: string;
};

export type IssuerDescriptorV2 = {
  readonly algorithms: readonly string[];
  readonly apiVersions: readonly string[];
  readonly assertionTypes: readonly string[];
  readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
  readonly environment: CustomerLicenseIssuerEnvironmentV2;
  readonly issuer: string;
  readonly issuerRef: string;
  readonly keysetRevision: number;
  readonly keysetUrl: string;
  readonly status: "active" | "recovery_required";
};

/** Stable local-adapter failure. Its public fields are transport-neutral. */
export class CustomerLicenseIssuerCapabilityErrorV2 extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(input: { code: string; message: string; retryable?: boolean }) {
    super(input.message);
    this.name = "CustomerLicenseIssuerCapabilityErrorV2";
    this.code = input.code;
    this.retryable = input.retryable ?? false;
  }
}

export type CatalogRequestV2 = {
  readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
  readonly ifNoneMatch?: string | null;
};

export type CatalogProfileV2 = {
  readonly allowedClaimSources: readonly string[];
  readonly audience: string;
  /** Public, non-internal claim fields and the Webshop sources allowed for each. */
  readonly claimMappings?: readonly {
    readonly field: string;
    readonly required?: boolean;
    readonly sources: readonly string[];
  }[];
  readonly claimSchema: ClaimSchemaRefV2 | null;
  readonly deprecatedAt?: string | null;
  readonly delivery: {
    readonly licenseKey: boolean;
    readonly offlineFile: boolean;
    readonly signedAssertion: boolean;
  };
  readonly features: readonly string[];
  readonly licenseType: string;
  readonly limits: CustomerLicenseIssuerJsonObjectV2;
  readonly profile: LicenseProfileRefV2;
  readonly status: "deprecated" | "published";
};

export type CatalogProductV2 = {
  readonly audience: string;
  readonly name: string;
  readonly productTypeRef: string;
  readonly profiles: readonly CatalogProfileV2[];
};

export type CatalogSnapshotV2 = {
  readonly environment: CustomerLicenseIssuerEnvironmentV2;
  readonly etag: string;
  readonly issuerRef: string;
  readonly products: readonly CatalogProductV2[];
  readonly revision: number;
};

export type CatalogResultV2 =
  | {
      readonly catalog: CatalogSnapshotV2;
      readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
      readonly status: "ok";
    }
  | {
      readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
      readonly etag: string;
      readonly revision: number;
      readonly status: "not_modified";
    };

export type IssueCommandV2 = {
  readonly claimInput?: CustomerLicenseIssuerJsonObjectV2;
  /** Source evidence is optional for older V2 clients. When present, the
   * issuer validates every field/source pair against the published revision. */
  readonly claimSources?: Readonly<Record<string, string>>;
  readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
  readonly customer: {
    readonly displayName?: string | null;
    readonly email?: string | null;
    readonly externalRef: string;
  };
  readonly idempotencyKey: string;
  readonly productTypeRef: string;
  readonly profile: LicenseProfileRefV2;
  readonly source: {
    readonly correlationId?: string | null;
    readonly orderItemRef?: string | null;
    readonly orderRef?: string | null;
    readonly system: string;
  };
};

export type LicenseReceiptV2 = {
  readonly assertion?: string | null;
  readonly claimSchema: ClaimSchemaRefV2 | null;
  readonly expiresAt: string | null;
  readonly id: string;
  readonly issuedAt: string;
  readonly issuerRef: string;
  /** Reveal-once secret. Omitted after the permitted reveal has been consumed. */
  readonly licenseKey?: string;
  readonly licenseKeyMasked: string;
  readonly licenseId: string;
  readonly profile: LicenseProfileRefV2;
};

export type OperationErrorV2 = {
  readonly code: string;
  readonly details?: CustomerLicenseIssuerJsonObjectV2;
  readonly message: string;
  readonly retryable: boolean;
};

export type OperationAcceptedV2 =
  | {
      readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
      readonly operation: {
        readonly id: string;
        readonly pollAfterMs?: number;
        readonly status: "pending" | "running";
      };
    }
  | {
      readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
      readonly operation: {
        readonly id: string;
        readonly receipt: LicenseReceiptV2;
        readonly status: "succeeded";
      };
    };

export type OperationQueryV2 = {
  readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
  readonly operationId: string;
};

export type OperationResultV2 =
  | OperationAcceptedV2
  | {
      readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
      readonly operation: {
        readonly error: OperationErrorV2;
        readonly id: string;
        readonly status: "dead_letter" | "failed";
      };
    };

export type LifecycleActionV2 =
  | "chargeback"
  | "refund"
  | "renew"
  | "resume"
  | "revoke"
  | "suspend";

export type LicenseRefV2 =
  | {
      readonly licenseId: string;
    }
  | {
      readonly sourceOrderItemRef: string;
      readonly sourceSystem?: string;
    };

export type LifecycleCommandV2 = {
  readonly action: LifecycleActionV2;
  readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
  readonly effectiveAt?: string | null;
  readonly idempotencyKey: string;
  readonly licenseRef: LicenseRefV2;
  readonly newExpiresAt?: string | null;
  readonly reason: string;
};

/**
 * Canonical customer-issuer contract shared by local and remote adapters.
 * Authentication, HTTP headers and status URLs belong to the adapter, not to
 * these business payloads. This contract never carries a Vendor/Master secret.
 */
export type CustomerLicenseIssuerV2 = {
  readonly contractVersion: CustomerLicenseIssuerContractVersionV2;
  catalog(input: CatalogRequestV2): Promise<CatalogResultV2>;
  describe(): Promise<IssuerDescriptorV2>;
  enqueueIssue(input: IssueCommandV2): Promise<OperationResultV2>;
  enqueueLifecycle(input: LifecycleCommandV2): Promise<OperationResultV2>;
  getOperation(input: OperationQueryV2): Promise<OperationResultV2>;
};

export type CustomerLicenseIssuerCapabilityV2 = CustomerLicenseIssuerV2;

export function isCustomerLicenseIssuerCapabilityV2(
  value: unknown,
): value is CustomerLicenseIssuerCapabilityV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CustomerLicenseIssuerCapabilityV2>;

  return (
    candidate.contractVersion === "2" &&
    typeof candidate.catalog === "function" &&
    typeof candidate.describe === "function" &&
    typeof candidate.enqueueIssue === "function" &&
    typeof candidate.enqueueLifecycle === "function" &&
    typeof candidate.getOperation === "function"
  );
}
