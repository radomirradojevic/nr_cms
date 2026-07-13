import { createHmac, randomUUID } from "node:crypto";

export type RedeployCallbackAuth = {
  kid: string;
  secret: string;
};

export function buildRedeployCallbackRequest(input: {
  auth: RedeployCallbackAuth;
  packageName: string | null;
  packageVersion: string | null;
  url: string;
}) {
  const url = new URL(input.url);
  const body = JSON.stringify({
    packageName: input.packageName,
    packageVersion: input.packageVersion,
    version: 1,
  });
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();
  const canonical = ["NR-REDEPLOY-V1", input.auth.kid, requestId, timestamp, "POST", url.pathname, body].join("\n");
  const signature = createHmac("sha256", input.auth.secret).update(canonical).digest("base64url");
  return {
    body,
    headers: {
      authorization: `NR-REDEPLOY-V1 ${input.auth.kid}:${signature}`,
      "content-type": "application/json",
      "x-nr-redeploy-request-id": requestId,
      "x-nr-redeploy-timestamp": timestamp,
    },
    url: url.toString(),
  };
}
