import "server-only";

import {
  parseNightRavenRemediationFlags,
  type NightRavenRemediationFlag,
  type NightRavenRemediationFlags,
} from "./feature-flags-core";

export {
  NIGHT_RAVEN_REMEDIATION_FLAGS,
  type NightRavenRemediationFlag,
  type NightRavenRemediationFlags,
} from "./feature-flags-core";

/**
 * Server-only rollout flags. Invalid and omitted values fail closed. These are
 * intentionally independent of license/entitlement enforcement and must not
 * be passed to browser code.
 */
export function getNightRavenRemediationFlags(
  env: Record<string, string | undefined> = process.env,
): NightRavenRemediationFlags {
  return parseNightRavenRemediationFlags(env);
}

export function isNightRavenRemediationFlagEnabled(
  flag: NightRavenRemediationFlag,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getNightRavenRemediationFlags(env)[flag];
}
