export const DEFAULT_MASTER_LICENSE_SERVER_URL = "https://ls.nrcms.com";

type EnvLike = Record<string, string | undefined>;

export function getMasterLicenseServerUrl(
  env: EnvLike = process.env,
): string {
  return (
    env.NR_MASTER_LICENSE_URL?.trim() || DEFAULT_MASTER_LICENSE_SERVER_URL
  ).replace(/\/+$/, "");
}

export function masterLicenseServerUrl(
  path: string,
  env: EnvLike = process.env,
): string {
  return `${getMasterLicenseServerUrl(env)}/${path.replace(/^\/+/, "")}`;
}
