import { candidateReadinessAuthError, receiveCandidateReadinessV1 } from "@/lib/addon-runtime/candidate-readiness";
import { readBoundedRequestBody, RequestBodyTooLargeError } from "@/lib/addon-runtime/bounded-request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Buffer;
  try { body = await readBoundedRequestBody(request, 64 * 1024); }
  catch (error) { return new Response(null, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers: { "Cache-Control": "no-store" } }); }
  try {
    const result = await receiveCandidateReadinessV1({ body, headers: request.headers, method: request.method, pathname: new URL(request.url).pathname });
    return new Response(result.body, { status: result.status, headers: result.headers });
  } catch (error) {
    const result = candidateReadinessAuthError(error);
    return new Response(result.body, { status: result.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
}
