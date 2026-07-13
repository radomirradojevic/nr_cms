import type { AddonHostContextV1 } from "@nr-cms/addon-sdk/host-services";
import type { AddonManifestV1 } from "@nr-cms/addon-sdk/manifest";
import type { AddonRuntimeV1, RegisteredAddonV1 } from "@nr-cms/addon-sdk/runtime";

export function validateSdkRuntime(runtime: AddonRuntimeV1): { ok: true } | { ok: false; reason: string } {
  const manifest = runtime.manifest;
  if (manifest.manifestVersion !== 1 || manifest.runtimeContractVersion !== "1") return { ok: false, reason: "unsupported_sdk_contract" };
  if (!manifest.addonKey || !manifest.packageName || !manifest.packageVersion) return { ok: false, reason: "invalid_sdk_manifest" };
  return { ok: true };
}

export async function registerSdkAddon(runtime: AddonRuntimeV1, host: AddonHostContextV1) {
  const valid = validateSdkRuntime(runtime);
  if (!valid.ok) return valid;
  const registered = await runtime.register(host);
  const declared = new Set(runtime.manifest.capabilities.apiRoutes?.map((route) => route.id) ?? []);
  for (const id of Object.keys(registered.apiRouter ?? {})) if (!declared.has(id)) return { ok: false as const, reason: "undeclared_runtime_route" };
  const declaredJobs = new Set(runtime.manifest.capabilities.jobs?.map((job) => job.id) ?? []);
  for (const id of Object.keys(registered.jobs ?? {})) if (!declaredJobs.has(id)) return { ok: false as const, reason: "undeclared_runtime_job" };
  return { ok: true as const, manifest: runtime.manifest, registered };
}

export async function dispatchSdkRoute(input: { descriptor: AddonManifestV1["capabilities"]["apiRoutes"] extends readonly (infer T)[] | undefined ? T : never; handler: (request: Request, host: AddonHostContextV1) => Promise<Response>; request: Request; host: AddonHostContextV1; licenseMode: "ready" | "existing_operations" }) {
  const descriptor = input.descriptor as { auth: string; permission?: string; licensePolicy: string; maxBodyBytes?: number };
  if (descriptor.maxBodyBytes && Number(input.request.headers.get("content-length") ?? 0) > descriptor.maxBodyBytes) return new Response("Payload too large", { status: 413 });
  if (descriptor.auth === "admin") await input.host.auth.requireAdmin();
  if (descriptor.auth === "session") await input.host.auth.requireUser();
  if (descriptor.permission) await input.host.auth.requirePermission(descriptor.permission);
  if (descriptor.licensePolicy === "ready_only" && input.licenseMode !== "ready") return new Response("Addon license is not ready", { status: 403 });
  return input.handler(input.request, input.host);
}
