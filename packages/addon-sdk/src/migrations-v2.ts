export const ADDON_MIGRATION_MANIFEST_VERSION = 2 as const;

export type AddonMigrationCompatibilityV2 = {
  readonly addonVersionRange: string;
  readonly cmsVersionRange: string;
};

export type AddonMigrationDescriptorV2 = {
  readonly checksum: string;
  readonly compatibility: AddonMigrationCompatibilityV2;
  readonly destructive: false;
  readonly id: string;
  readonly path: `migrations/${string}.sql`;
  readonly requiresBackup: boolean;
  readonly rollbackPolicy: "expand_compatible";
  readonly schemaVersion: number;
};

/**
 * Transport-neutral, data-only manifest consumed by a host-owned runner.
 * It intentionally contains no command, module or script entrypoint.
 */
export type AddonMigrationManifestV2 = {
  readonly addonKey: "webshop" | "license-server";
  readonly manifestVersion: 2;
  readonly migrations: readonly AddonMigrationDescriptorV2[];
  readonly packageName:
    | "@radomirradojevic/webshop"
    | "@radomirradojevic/license-server-addon";
  readonly packageVersion: string;
};
