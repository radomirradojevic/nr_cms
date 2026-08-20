export type CustomerLicenseIssuerJobTriggerV1 =
  | "cron"
  | "manual"
  | "recovery"
  | "test";

export type CustomerLicenseIssuerOperationsJobInputV1 = {
  readonly contractVersion: "1";
  readonly correlationId: string;
  readonly deadlineAt?: string | null;
  readonly limit: number;
  readonly trigger: CustomerLicenseIssuerJobTriggerV1;
};

export type CustomerLicenseIssuerOperationsJobResultV1 = {
  readonly claimed: number;
  readonly contractVersion: "1";
  readonly deadLettered: number;
  readonly leaseStatus: "acquired" | "deadline_exceeded" | "held";
  readonly retried: number;
  readonly runId: string;
  readonly succeeded: number;
};

export type CustomerLicenseIssuerOperationsJobV1 = (
  input: CustomerLicenseIssuerOperationsJobInputV1,
) => Promise<CustomerLicenseIssuerOperationsJobResultV1>;
