#!/usr/bin/env node

import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";

const DEFAULT_INTERVAL_SECONDS = 60;
const DEFAULT_TIMEOUT_MS = 30_000;

function getArgValue(name) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function hasArg(name) {
  return process.argv.slice(2).includes(name);
}

function envBoolean(name, fallback) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  throw new Error(`${name} must be a boolean value.`);
}

function positiveInteger(value, name, fallback) {
  const raw = value?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function resolveEndpoint() {
  const explicitUrl =
    getArgValue("--url") ?? process.env.CONTENT_PUBLISHING_CRON_URL;
  if (explicitUrl) return explicitUrl;

  const baseUrl =
    process.env.CONTENT_PUBLISHING_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    `http://localhost:${process.env.PORT ?? "3000"}`;

  return `${normalizeBaseUrl(baseUrl)}/api/cron/content-publishing`;
}

function resolveSecret() {
  const secrets = [
    process.env.CONTENT_PUBLISHING_CRON_SECRET,
    process.env.CRON_SECRET,
  ].flatMap((value) => {
    const secret = value?.trim();
    return secret ? [secret] : [];
  });
  return secrets[0] ?? "";
}

async function runOnce({ endpoint, secret, timeoutMs }) {
  const startedAt = new Date();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "x-cron-secret": secret,
      "user-agent": "nr-cms-content-publishing-scheduler/1.0",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await response.text();
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // Keep non-JSON error pages readable in logs.
  }

  const summary =
    payload && typeof payload === "object"
      ? `published=${payload.published ?? 0} unpublished=${payload.unpublished ?? 0}`
      : String(payload).slice(0, 300);

  console.log(
    `[content-scheduler] ${startedAt.toISOString()} status=${response.status} ${summary}`,
  );

  if (!response.ok) {
    throw new Error(
      `Content publishing cron failed with HTTP ${response.status}.`,
    );
  }
}

async function main() {
  const watch = hasArg("--watch");
  const once = hasArg("--once") || !watch;
  if (watch && hasArg("--once")) {
    throw new Error("Use either --once or --watch, not both.");
  }

  const enabled = envBoolean("CONTENT_PUBLISHING_SCHEDULER_ENABLED", true);
  if (!enabled) {
    console.log(
      "[content-scheduler] disabled by CONTENT_PUBLISHING_SCHEDULER_ENABLED.",
    );
    return;
  }

  const endpoint = resolveEndpoint();
  const secret = resolveSecret();
  if (!secret) {
    throw new Error(
      "Set CRON_SECRET or CONTENT_PUBLISHING_CRON_SECRET before running the scheduler.",
    );
  }

  const timeoutMs = positiveInteger(
    getArgValue("--timeout-ms") ??
      process.env.CONTENT_PUBLISHING_SCHEDULER_TIMEOUT_MS,
    "CONTENT_PUBLISHING_SCHEDULER_TIMEOUT_MS",
    DEFAULT_TIMEOUT_MS,
  );
  const intervalSeconds = positiveInteger(
    getArgValue("--interval-seconds") ??
      process.env.CONTENT_PUBLISHING_SCHEDULER_INTERVAL_SECONDS,
    "CONTENT_PUBLISHING_SCHEDULER_INTERVAL_SECONDS",
    DEFAULT_INTERVAL_SECONDS,
  );

  if (once) {
    await runOnce({ endpoint, secret, timeoutMs });
    return;
  }

  console.log(
    `[content-scheduler] watching ${endpoint} every ${intervalSeconds}s`,
  );

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopping) {
    try {
      await runOnce({ endpoint, secret, timeoutMs });
    } catch (error) {
      console.error(
        `[content-scheduler] ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!stopping) {
      await delay(intervalSeconds * 1000);
    }
  }

  console.log("[content-scheduler] stopped.");
}

main().catch((error) => {
  console.error(
    `[content-scheduler] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
