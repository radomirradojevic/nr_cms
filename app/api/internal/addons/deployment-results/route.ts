import { deploymentResultErrorResponse, receiveDeploymentResultV2 } from "@/lib/addon-runtime/deployment-result-callback";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = Buffer.from(await request.arrayBuffer());
  try {
    const result = await receiveDeploymentResultV2({ body, headers: request.headers, method: request.method, pathname: new URL(request.url).pathname });
    return new Response(result.body, { status: result.status, headers: result.headers });
  } catch (error) {
    const response = deploymentResultErrorResponse(error);
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json" } });
  }
}
export const dynamic = "force-dynamic";
