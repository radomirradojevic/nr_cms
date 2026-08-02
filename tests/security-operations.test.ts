import assert from "node:assert/strict";
import test from "node:test";
import { redactForLog } from "@/lib/security/logger";
import {
  assertResolvedOutboundHost,
  assertSafeOutboundUrl,
  createPinnedLookup,
  isExplicitlyAllowedLoopbackHttpUrl,
  safeFetch,
} from "@/lib/security/outbound-url";

const SENTINEL = "nr-secret-sentinel-do-not-log";

test("structured redaction removes a sentinel from nested log fields", () => {
  const output = JSON.stringify(
    redactForLog({
      authorization: `Bearer ${SENTINEL}`,
      nested: { licenseKey: SENTINEL },
      safe: "ok",
    }),
  );
  assert.equal(output.includes(SENTINEL), false);
  assert.match(output, /REDACTED/);
});

test("structured redaction keeps a sentinel out of error objects", () => {
  const output = JSON.stringify(
    redactForLog({ error: new Error(`provider failed: ${SENTINEL}`) }),
  );
  assert.equal(output.includes(SENTINEL), false);
});

test("outbound guard rejects HTTP, loopback and credential URLs", () => {
  for (const value of [
    "http://license-server.nrcms.com",
    "https://127.0.0.1/internal",
    "https://user:pass@example.com",
  ]) {
    assert.throws(() =>
      assertSafeOutboundUrl(value, {
        allowFirstParty: false,
        allowSelfHosted: false,
        purpose: "test",
      }),
    );
  }
  assert.equal(
    assertSafeOutboundUrl("https://license-server.nrcms.com/api/v1", {
      allowFirstParty: true,
      allowSelfHosted: false,
      purpose: "test",
    }).hostname,
    "license-server.nrcms.com",
  );
});

test("outbound guard permits a caller-approved loopback HTTP transport", () => {
  assert.equal(
    assertSafeOutboundUrl("http://localhost:3001/api", {
      allowLocalHttp: true,
      allowSelfHosted: true,
      env: { NR_ALLOW_INSECURE_LOOPBACK_HTTP: "true" },
      purpose: "test",
    }).hostname,
    "localhost",
  );
});

test("loopback HTTP transport requires an explicit env exception in every mode", () => {
  assert.equal(
    isExplicitlyAllowedLoopbackHttpUrl("http://localhost:3001", {
      NODE_ENV: "development",
    }),
    false,
  );
  assert.equal(
    isExplicitlyAllowedLoopbackHttpUrl("http://localhost:3001", {
      NODE_ENV: "production",
      NR_ALLOW_INSECURE_LOOPBACK_HTTP: "true",
    }),
    true,
  );
  assert.equal(
    isExplicitlyAllowedLoopbackHttpUrl("https://localhost:3001", {
      NR_ALLOW_INSECURE_LOOPBACK_HTTP: "true",
    }),
    false,
  );
  assert.equal(
    isExplicitlyAllowedLoopbackHttpUrl("http://license-server.local:3001", {
      NR_ALLOW_INSECURE_LOOPBACK_HTTP: "true",
    }),
    false,
  );
});

test("outbound allowlisting is enforced independently of NODE_ENV", () => {
  assert.throws(
    () =>
      assertSafeOutboundUrl("https://untrusted.example/api", {
        allowFirstParty: true,
        allowSelfHosted: false,
        purpose: "test",
      }),
    /allowlisted/,
  );
  assert.equal(
    assertSafeOutboundUrl("https://ls.nrcms.com/api", {
      allowFirstParty: true,
      allowSelfHosted: false,
      purpose: "test",
    }).hostname,
    "ls.nrcms.com",
  );
});

test("local Caddy HTTPS requires exact self-hosted and host allowlist gates", () => {
  const base = {
    NR_LICENSE_ENVIRONMENT: "development",
    NRLS_ALLOWED_OUTBOUND_HOSTS: "license.nr.test",
  };
  assert.throws(
    () =>
      assertSafeOutboundUrl("https://license.nr.test/api", {
        allowFirstParty: true,
        allowSelfHosted: true,
        env: base,
        purpose: "test",
      }),
    /private network/i,
  );
  assert.equal(
    assertSafeOutboundUrl("https://license.nr.test/api", {
      allowFirstParty: true,
      allowSelfHosted: true,
      env: { ...base, NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true" },
      purpose: "test",
    }).hostname,
    "license.nr.test",
  );
  for (const value of [
    "http://license.nr.test/api",
    "https://other.nr.test/api",
  ]) {
    assert.throws(() =>
      assertSafeOutboundUrl(value, {
        allowFirstParty: true,
        allowSelfHosted: true,
        env: { ...base, NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true" },
        purpose: "test",
      }),
    );
  }
});

test("outbound guard rejects a public hostname that resolves to a private address", async () => {
  await assert.rejects(
    assertResolvedOutboundHost(
      new URL("https://license-server.example.test"),
      { allowSelfHosted: false, purpose: "test" },
      async () => [{ address: "127.0.0.1", family: 4 }],
    ),
    /private network address/,
  );
});

test("outbound guard rejects IPv4-mapped IPv6 private addresses", async () => {
  await assert.rejects(
    assertResolvedOutboundHost(
      new URL("https://license-server.example.test"),
      { allowSelfHosted: false, purpose: "test" },
      async () => [{ address: "::ffff:127.0.0.1", family: 6 }],
    ),
    /private network address/,
  );
});

test("outbound fetch enforces the byte limit without a Content-Length header", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("0123456789", { status: 200 });
  try {
    await assert.rejects(
      safeFetch("https://license.nr.test/fixture", {
        allowSelfHosted: true,
        outboundEnvironment: {
          NR_LICENSE_ENVIRONMENT: "development",
          NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true",
          NRLS_ALLOWED_OUTBOUND_HOSTS: "license.nr.test",
        },
        maxResponseBytes: 8,
        purpose: "test",
      }),
      /response exceeds size limit/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("outbound fetch pins the preflight DNS result for the connection", async () => {
  const originalFetch = globalThis.fetch;
  let dispatcher: unknown;
  let nativeInit: (RequestInit & { allowSelfHosted?: unknown }) | undefined;
  globalThis.fetch = async (_url, init) => {
    nativeInit = init as RequestInit & { allowSelfHosted?: unknown };
    dispatcher = (init as RequestInit & { dispatcher?: unknown }).dispatcher;
    return new Response("ok", { status: 200 });
  };
  try {
    await safeFetch("https://license.nr.test/fixture", {
      allowSelfHosted: true,
      outboundEnvironment: {
        NR_LICENSE_ENVIRONMENT: "development",
        NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true",
        NRLS_ALLOWED_OUTBOUND_HOSTS: "license.nr.test",
      },
      purpose: "test",
    });
    assert.ok(
      dispatcher,
      "guarded fetch must connect through a DNS-pinned dispatcher",
    );
    assert.equal(nativeInit?.allowSelfHosted, undefined);
    const lookup = createPinnedLookup([
      { address: "93.184.216.34", family: 4 },
    ]);
    const resolved: unknown[] = [];
    for (const hostname of ["first.example", "rebound.example"]) {
      lookup(hostname, { all: false }, (error, address, family) => {
        assert.equal(error, null);
        resolved.push({ address, family });
      });
    }
    assert.deepEqual(resolved, [
      { address: "93.184.216.34", family: 4 },
      { address: "93.184.216.34", family: 4 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("outbound fetch cancels a rejected response body before closing its dispatcher", async () => {
  const originalFetch = globalThis.fetch;
  let canceled = false;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        cancel: () => {
          canceled = true;
        },
      }),
      { headers: { location: "https://example.test/redirected" }, status: 302 },
    );
  try {
    await assert.rejects(
      safeFetch("https://license.nr.test/fixture", {
        allowSelfHosted: true,
        outboundEnvironment: {
          NR_LICENSE_ENVIRONMENT: "development",
          NRLS_ALLOW_SELF_HOSTED_OUTBOUND: "true",
          NRLS_ALLOWED_OUTBOUND_HOSTS: "license.nr.test",
        },
        purpose: "test",
      }),
      /redirects are not permitted/i,
    );
    assert.equal(canceled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("outbound DNS preflight obeys the request deadline", async () => {
  const outcome = await Promise.race([
    assertResolvedOutboundHost(
      new URL("https://license-server.example.test"),
      { allowSelfHosted: false, purpose: "test" },
      async () => new Promise(() => undefined),
      Date.now() + 20,
    ).then(
      () => "resolved",
      (error: unknown) =>
        error instanceof Error ? error.message : String(error),
    ),
    new Promise<string>((resolve) =>
      setTimeout(() => resolve("external test timeout"), 100),
    ),
  ]);
  assert.match(outcome, /timed out/i);
});
