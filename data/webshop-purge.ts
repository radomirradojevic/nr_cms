import "server-only";

/**
 * The CMS core owns the Webshop content anchor, but never Webshop business
 * data. A destructive purge used to truncate the legacy public tables from
 * here. That would bypass the package-owned `webshop` schema, its immutable
 * financial-history triggers, and the addon lifecycle contract.
 *
 * Keep the call boundary so callers fail closed during the transition. A
 * future package-owned, audited lifecycle operation may replace it; core must
 * not grow a second Webshop data model or issue raw business-table SQL.
 */
export type WebshopPurgeClient = unknown;

export class WebshopLifecycleOperationRequiredError extends Error {
  constructor() {
    super(
      "Webshop hard deletion is unavailable: archive or disable the webshop through its addon lifecycle operation.",
    );
    this.name = "WebshopLifecycleOperationRequiredError";
  }
}

export async function purgeWebshopData(
  _client: WebshopPurgeClient,
  _actorId: string,
): Promise<never> {
  throw new WebshopLifecycleOperationRequiredError();
}
