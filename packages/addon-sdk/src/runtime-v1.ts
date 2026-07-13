import type { AddonHostContextV1 } from "./host-services-v1";
import type { AddonManifestV1 } from "./manifest-v1";
import type { AddonApiRouter } from "./routing-v1";
export type LifecycleResult = { ok: boolean; reason?: string };
export type AddonLifecycleHooksV1 = { postInstall?(operationId: string): Promise<LifecycleResult>; activate?(operationId: string): Promise<LifecycleResult>; deactivate?(operationId: string): Promise<LifecycleResult>; beforeUpgrade?(operationId: string): Promise<LifecycleResult>; afterUpgrade?(operationId: string): Promise<LifecycleResult>; beforeUninstall?(operationId: string): Promise<LifecycleResult>; uninstall?(operationId: string, mode: "retain" | "purge"): Promise<LifecycleResult> };
export type RegisteredAddonV1 = { apiRouter?: AddonApiRouter; jobs?: Readonly<Record<string, (input: unknown) => Promise<unknown>>>; lifecycle?: AddonLifecycleHooksV1 };
export type AddonRuntimeV1 = { manifest: AddonManifestV1; register(context: AddonHostContextV1): Promise<RegisteredAddonV1> };
