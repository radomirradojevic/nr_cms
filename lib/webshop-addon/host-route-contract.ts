/**
 * Pure V1 inventory shared by build-time registry validation and server-side
 * delegates. Keeping it free of runtime imports prevents loader cycles.
 */
export const HostAddonRouteBindingsV1 = {
  apiWebshop: { id: "webshop.api.v1", kind: "api", path: ["api", "webshop", "*"] },
  download: { id: "webshop.download.v1", kind: "api", path: ["slug", "downloads", "*"] },
  paddleWebhook: { id: "webshop.paddle-webhook.v1", kind: "api", path: ["api", "webhooks", "paddle"] },
  purchaseIntentAccept: { id: "webshop.purchase-intent-accept.v1", kind: "api", path: ["licenses", "purchase-intents", "accept"] },
  storefront: { id: "webshop.storefront.v1", kind: "render", path: ["slug", "*"] },
  dashboard: { id: "webshop.dashboard.v1", kind: "render", path: ["dashboard", "webshop", "*"] },
  fulfillmentJob: { id: "webshop.fulfillment-job.v1", kind: "job", path: ["cron", "webshop-license-issues"] },
  fileAuthorization: { id: "webshop.file-authorization.v1", kind: "authorization", path: ["api", "files", "id"] },
  formSubmissionVisibility: { id: "webshop.form-submission-visibility.v1", kind: "authorization", path: ["forms", "submissions"] },
} as const;

export type HostAddonRouteBindingId =
  (typeof HostAddonRouteBindingsV1)[keyof typeof HostAddonRouteBindingsV1]["id"];

export const HOST_WEBSHOP_ROUTE_BINDING_IDS = Object.values(
  HostAddonRouteBindingsV1,
).map((binding) => binding.id) as readonly HostAddonRouteBindingId[];

export function validateWebshopHostBindings(
  declared: readonly string[] | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!Array.isArray(declared)) {
    return { ok: false, reason: "Webshop package does not declare HostAddonRouteBindingsV1." };
  }
  const actual = new Set(declared);
  if (actual.size !== declared.length) {
    return { ok: false, reason: "Webshop package declares a duplicate host binding." };
  }
  const expected = new Set(HOST_WEBSHOP_ROUTE_BINDING_IDS);
  const unknown = [...actual].find((entry) => !expected.has(entry as HostAddonRouteBindingId));
  if (unknown) return { ok: false, reason: `Webshop package declares an unknown host binding: ${unknown}.` };
  const missing = [...expected].find((entry) => !actual.has(entry));
  if (missing) return { ok: false, reason: `Webshop package is missing host binding: ${missing}.` };
  return { ok: true };
}
