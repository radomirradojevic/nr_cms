import { deploymentResultErrorResponse, receiveDeploymentResultV2 } from "@/lib/addon-runtime/deployment-result-callback";
import { readBoundedRequestBody, RequestBodyTooLargeError } from "@/lib/addon-runtime/bounded-request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Buffer;
  try { body = await readBoundedRequestBody(request, 512 * 1024); }
  catch (error) { return new Response(null, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers: { "Cache-Control": "no-store" } }); }
  try {
    const result = await receiveDeploymentResultV2({ body, headers: request.headers, method: request.method, pathname: new URL(request.url).pathname });
    return new Response(result.body, { status: result.status, headers: result.headers });
  } catch (error) {
    const response = deploymentResultErrorResponse(error);
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json" } });
  }
}
export const dynamic = "force-dynamic";
