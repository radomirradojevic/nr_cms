declare module "@/.private/license-server-addon/src/addon" {
  import type { LicenseServerAddon } from "@/lib/license-server-addon/contract";

  export const licenseServerAddon: LicenseServerAddon;
  export default licenseServerAddon;
}
