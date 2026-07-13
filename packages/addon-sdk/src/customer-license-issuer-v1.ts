/** Local-only capability; it deliberately carries no Night Raven Vendor API credential. */
export type CustomerLicenseIssueCommandV1 = { operationKey: string; customerExternalRef: string; productTypeId: string; sku: string; orderRef?: string | null; orderItemRef?: string | null; metadata?: Record<string, unknown> };
export type CustomerLicenseIssueResultV1 = { accepted: true; operationId: string } | { accepted: false; reason: string };
export type CustomerLicenseIssuerCapabilityV1 = { contractVersion: "1"; enqueueIssue(command: CustomerLicenseIssueCommandV1): Promise<CustomerLicenseIssueResultV1> };
