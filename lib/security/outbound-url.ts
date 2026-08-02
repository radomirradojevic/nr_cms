import { lookup } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";

import { Agent } from "undici";

type OutboundAddressResolver = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<readonly { address: string; family: number }[]>;

const PRIVATE_HOST = /^(localhost|.*\.local)$/i;
const PRIVATE_IP =
  /^(127\.|0\.0\.0\.0$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd)/i;
const FIRST_PARTY_LICENSE_SERVER_HOSTS = new Set([
  "ls.nrcms.com",
  "license-server.nrcms.com",
]);

function configuredOutboundHosts(
  env: Record<string, string | undefined> = process.env,
) {
  return new Set(
    (env.NRLS_ALLOWED_OUTBOUND_HOSTS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isExplicitlyApprovedSelfHostedUrl(
  url: URL,
  input: {
    allowLocalHttp?: boolean;
    allowSelfHosted?: boolean;
  },
  env: Record<string, string | undefined> = process.env,
) {
  if (input.allowSelfHosted !== true) return false;
  const hostname = url.hostname.toLowerCase();
  const localHttp =
    input.allowLocalHttp === true &&
    url.protocol === "http:" &&
    isExplicitlyAllowedLoopbackHttpUrl(url.toString(), env);
  if (localHttp) return true;
  if (
    url.protocol !== "https:" ||
    env.NRLS_ALLOW_SELF_HOSTED_OUTBOUND?.trim().toLowerCase() !== "true" ||
    !configuredOutboundHosts(env).has(hostname)
  ) {
    return false;
  }
  return (
    !hostname.endsWith(".nr.test") ||
    env.NR_LICENSE_ENVIRONMENT?.trim().toLowerCase() === "development"
  );
}

export function isExplicitlyAllowedLoopbackHttpUrl(
  raw: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
) {
  if (
    !raw ||
    env.NR_ALLOW_INSECURE_LOOPBACK_HTTP?.trim().toLowerCase() !== "true"
  ) {
    return false;
  }
  try {
    const url = new URL(raw);
    return url.protocol === "http:" && isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
}

export function assertSafeOutboundUrl(
  raw: string,
  input: {
    allowFirstParty?: boolean;
    allowLocalHttp?: boolean;
    allowSelfHosted?: boolean;
    purpose: string;
    env?: Record<string, string | undefined>;
  },
) {
  const env = input.env ?? process.env;
  const url = new URL(raw);
  const localHttp =
    input.allowLocalHttp === true &&
    url.protocol === "http:" &&
    isExplicitlyAllowedLoopbackHttpUrl(raw, env);
  if (url.protocol !== "https:" && !localHttp)
    throw new Error(`${input.purpose} must use HTTPS.`);
  const hostname = url.hostname.toLowerCase();
  const firstParty = FIRST_PARTY_LICENSE_SERVER_HOSTS.has(hostname);
  const allowedHosts = configuredOutboundHosts(env);
  if (
    input.allowFirstParty &&
    !localHttp &&
    !firstParty &&
    !allowedHosts.has(hostname)
  ) {
    throw new Error(`${input.purpose} host is not allowlisted.`);
  }
  const selfHosted = isExplicitlyApprovedSelfHostedUrl(url, input, env);
  if (
    !selfHosted &&
    (PRIVATE_HOST.test(hostname) ||
      PRIVATE_IP.test(hostname) ||
      hostname.endsWith(".nr.test"))
  )
    throw new Error(`${input.purpose} cannot target private network hosts.`);
  if (url.username || url.password || url.hash)
    throw new Error(`${input.purpose} has unsupported URL components.`);
  return url;
}

export async function assertResolvedOutboundHost(
  url: URL,
  input: { allowSelfHosted: boolean; purpose: string },
  resolver: OutboundAddressResolver = lookup,
  deadlineAt?: number,
) {
  if (
    isIP(url.hostname) &&
    !input.allowSelfHosted &&
    PRIVATE_IP.test(url.hostname)
  )
    throw new Error(`${input.purpose} cannot target private network hosts.`);
  const resolution = resolver(url.hostname, { all: true, verbatim: true });
  const addresses =
    deadlineAt === undefined
      ? await resolution
      : await beforeDeadline(
          resolution,
          deadlineAt,
          `${input.purpose} DNS resolution timed out.`,
        );
  if (!addresses.length)
    throw new Error(`${input.purpose} host did not resolve.`);
  const vetted = addresses.map((entry) => {
    const family = isIP(entry.address);
    if (family !== 4 && family !== 6)
      throw new Error(`${input.purpose} host returned an invalid address.`);
    return { address: entry.address, family } as const;
  });
  for (const address of vetted) {
    if (!input.allowSelfHosted && isPrivateAddress(address.address))
      throw new Error(
        `${input.purpose} resolved to a private network address.`,
      );
  }
  return vetted;
}

export async function safeFetch(
  url: string | URL,
  init: RequestInit & {
    allowFirstParty?: boolean;
    allowLocalHttp?: boolean;
    allowSelfHosted?: boolean;
    purpose?: string;
    timeoutMs?: number;
    maxResponseBytes?: number;
    outboundEnvironment?: Record<string, string | undefined>;
  } = {},
) {
  const {
    allowFirstParty,
    allowLocalHttp,
    allowSelfHosted: allowSelfHostedOption,
    maxResponseBytes = 64 * 1024,
    outboundEnvironment = process.env,
    purpose = "Outbound request",
    timeoutMs = 10_000,
    ...requestInit
  } = init;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error("Outbound request timeout must be positive.");
  const deadlineAt = Date.now() + timeoutMs;
  const allowSelfHosted =
    allowSelfHostedOption ??
    outboundEnvironment.NRLS_ALLOW_SELF_HOSTED_OUTBOUND === "true";
  const parsed = assertSafeOutboundUrl(String(url), {
    allowFirstParty,
    allowLocalHttp,
    allowSelfHosted,
    env: outboundEnvironment,
    purpose,
  });
  const selfHosted = isExplicitlyApprovedSelfHostedUrl(
    parsed,
    { allowLocalHttp, allowSelfHosted },
    outboundEnvironment,
  );
  const addresses = await assertResolvedOutboundHost(
    parsed,
    { allowSelfHosted: selfHosted, purpose },
    lookup,
    deadlineAt,
  );
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new Error(`${purpose} timed out.`);
  const dispatcher = new Agent({
    connect: { lookup: createPinnedLookup(addresses) },
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), remainingMs);
  try {
    const response = await fetch(parsed, {
      ...requestInit,
      dispatcher,
      redirect: "manual",
      signal: controller.signal,
    } as RequestInit);
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Outbound redirects are not permitted.");
    }
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maxResponseBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Outbound response exceeds size limit.");
    }
    return await bufferBoundedResponse(response, maxResponseBytes);
  } finally {
    clearTimeout(timeout);
    await dispatcher.close();
  }
}

async function beforeDeadline<T>(
  promise: Promise<T>,
  deadlineAt: number,
  message: string,
) {
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new Error(message);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), remainingMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createPinnedLookup(
  addresses: readonly { address: string; family: 4 | 6 }[],
): LookupFunction {
  const pinned = addresses.map((entry) => ({ ...entry }));
  if (!pinned.length)
    throw new Error("A DNS-pinned dispatcher requires at least one address.");
  return (_hostname, options, callback) => {
    const requestedFamily =
      typeof options.family === "number" ? options.family : 0;
    const candidates =
      requestedFamily === 4 || requestedFamily === 6
        ? pinned.filter((entry) => entry.family === requestedFamily)
        : pinned;
    if (!candidates.length) {
      const error = Object.assign(
        new Error(
          "No preflight-approved address matches the requested family.",
        ),
        { code: "ENOTFOUND" },
      );
      callback(error, "", 0);
      return;
    }
    if (options.all) callback(null, candidates);
    else callback(null, candidates[0]!.address, candidates[0]!.family);
  };
}

async function bufferBoundedResponse(response: Response, maxBytes: number) {
  if (!response.body) return response;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Outbound response exceeds size limit.");
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function isPrivateAddress(value: string) {
  const normalized =
    value
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .split("%")[0] ?? "";
  const mappedDotted = normalized.match(
    /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/,
  )?.[1];
  if (mappedDotted) return isPrivateAddress(mappedDotted);
  const mappedHex = normalized.match(
    /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/,
  );
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1]!, 16);
    const low = Number.parseInt(mappedHex[2]!, 16);
    return isPrivateAddress(
      `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`,
    );
  }
  return (
    PRIVATE_IP.test(normalized) ||
    normalized === "::" ||
    normalized.startsWith("fe80:")
  );
}

function isLoopbackHostname(value: string) {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}
