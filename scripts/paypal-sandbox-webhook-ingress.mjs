import http from "node:http";

const WEBHOOK_PATH = "/api/webshop/payments/webhooks/paypal";
const MAX_BODY_BYTES = 1024 * 1024;

function positivePort(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535
    ? parsed
    : fallback;
}

const listenPort = positivePort(process.env.NR_PAYPAL_INGRESS_PORT, 3045);
const upstreamPort = positivePort(process.env.NR_PAYPAL_UPSTREAM_PORT, 3000);

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method !== "POST" || requestUrl.pathname !== WEBHOOK_PATH) {
    response.writeHead(404, {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    });
    response.end("Not found.");
    return;
  }

  const chunks = [];
  let receivedBytes = 0;
  let rejected = false;

  request.on("data", (chunk) => {
    if (rejected) return;
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_BODY_BYTES) {
      rejected = true;
      response.writeHead(413, {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("Payload too large.");
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });

  request.on("end", () => {
    if (rejected) return;
    const body = Buffer.concat(chunks);
    const headers = { ...request.headers };
    delete headers.connection;
    delete headers.host;
    delete headers["proxy-connection"];
    headers.host = "vendor.nr.test";
    headers["x-forwarded-proto"] = "https";
    headers["content-length"] = String(body.length);

    const upstream = http.request(
      {
        hostname: "::1",
        port: upstreamPort,
        method: "POST",
        path: WEBHOOK_PATH,
        headers,
      },
      (upstreamResponse) => {
        const responseHeaders = { ...upstreamResponse.headers };
        delete responseHeaders.connection;
        delete responseHeaders["transfer-encoding"];
        responseHeaders["cache-control"] = "no-store";
        response.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
        upstreamResponse.pipe(response);
      },
    );

    upstream.on("error", () => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(502, {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      });
      response.end("Upstream unavailable.");
    });
    upstream.end(body);
  });
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(listenPort, "127.0.0.1", () => {
  process.stdout.write(`PayPal webhook ingress listening on 127.0.0.1:${listenPort}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
