import type { AddonRouteDescriptor } from "./manifest-v1";
import type { AddonHostContextV1 } from "./host-services-v1";
export type AddonRouteHandler = (input: { request: Request; params: Record<string, string>; host: AddonHostContextV1 }) => Promise<Response>;
export type AddonApiRouter = Readonly<Record<string, AddonRouteHandler>>;
export type DeclaredRoute = { descriptor: AddonRouteDescriptor; handler: AddonRouteHandler };
