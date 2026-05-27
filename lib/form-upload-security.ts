export const FORM_UPLOAD_OWNER_PREFIX = "form-submission:";
export const FORM_UPLOAD_UNKNOWN_IP = "unknown";
export const FORM_UPLOAD_SHORT_WINDOW_MS = 10 * 60 * 1000;
export const FORM_UPLOAD_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FORM_UPLOAD_SHORT_WINDOW_MAX = 20;
export const FORM_UPLOAD_DAY_WINDOW_MAX = 100;

export function legacyFormUploadOwner(formId: string): string {
  return `${FORM_UPLOAD_OWNER_PREFIX}${formId}`;
}

export function buildFormUploadOwner(
  formId: string,
  ipHash: string | null,
): string {
  return `${legacyFormUploadOwner(formId)}:${ipHash ?? FORM_UPLOAD_UNKNOWN_IP}`;
}

export function isFormUploadOwner(uploadedBy: string, formId: string): boolean {
  const legacyOwner = legacyFormUploadOwner(formId);
  return uploadedBy === legacyOwner || uploadedBy.startsWith(`${legacyOwner}:`);
}
