import "server-only";

import { getGlobalSettings } from "@/data/global-settings";
import { SESSION_SECURITY_DEFAULTS } from "@/lib/global-settings";

/**
 * Server-only accessor exposing ONLY the session-security timer values to
 * the client provider. Backed by the cached `getGlobalSettings()` so it
 * shares the `global-settings` cache tag and revalidation lifecycle.
 *
 * NEVER expand the return shape to include other settings — the result is
 * passed as props into a Client Component.
 */
export async function getSessionSecuritySettings(): Promise<{
  maxSessionDurationMinutes: number;
  idleLogoutMinutes: number;
}> {
  const settings = await getGlobalSettings();
  const s = settings.sessionSecurity ?? SESSION_SECURITY_DEFAULTS;
  return {
    maxSessionDurationMinutes:
      s.maxSessionDurationMinutes ??
      SESSION_SECURITY_DEFAULTS.maxSessionDurationMinutes,
    idleLogoutMinutes:
      s.idleLogoutMinutes ?? SESSION_SECURITY_DEFAULTS.idleLogoutMinutes,
  };
}
