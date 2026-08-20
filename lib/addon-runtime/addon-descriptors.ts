export const MANAGED_ADDON_DEPLOYMENT_DESCRIPTORS = {
  "license-server": {
    addonKey: "license-server",
    packageName: "@nr-cms/license-server",
    routeSegment: "license-server",
  },
  webshop: {
    addonKey: "webshop",
    packageName: "@radomirradojevic/webshop",
    routeSegment: "webshop",
  },
} as const;

export type ManagedAddonKey = keyof typeof MANAGED_ADDON_DEPLOYMENT_DESCRIPTORS;
export type ManagedAddonPackageName =
  (typeof MANAGED_ADDON_DEPLOYMENT_DESCRIPTORS)[ManagedAddonKey]["packageName"];

export function requireManagedAddonDeploymentDescriptor(
  addonKey: string,
  packageName: string,
) {
  const descriptor =
    MANAGED_ADDON_DEPLOYMENT_DESCRIPTORS[addonKey as ManagedAddonKey];
  if (!descriptor || descriptor.packageName !== packageName) {
    throw new Error("managed_addon_descriptor_mismatch");
  }
  return descriptor;
}
