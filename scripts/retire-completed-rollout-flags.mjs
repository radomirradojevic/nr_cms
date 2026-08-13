import { lstat, open, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const RETIRED_FLAGS = new Set([
  "VENDOR_LICENSE_API_V2",
  "WEBSHOP_LICENSE_OUTBOX_V2",
  "WEBSHOP_PAYMENT_STATE_V2",
]);

const requestedPaths = process.argv.slice(2);
const envPaths = requestedPaths.length > 0 ? requestedPaths : [resolve(".env")];

for (const requestedPath of envPaths) {
  if (!isAbsolute(requestedPath)) {
    throw new Error("retired_rollout_env_path_must_be_absolute");
  }
  await retireFlags(requestedPath);
}

async function retireFlags(envPath) {
  const stat = await lstat(envPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 1024 * 1024) {
    throw new Error("retired_rollout_env_file_invalid");
  }

  const current = await readFile(envPath, "utf8");
  const seen = new Set();
  const removed = [];
  const kept = [];

  for (const line of current.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      kept.push(line);
      continue;
    }
    const key = match[1];
    if (seen.has(key)) throw new Error("retired_rollout_env_duplicate_key");
    seen.add(key);
    if (RETIRED_FLAGS.has(key)) removed.push(key);
    else kept.push(line);
  }

  const profileLine = kept.find((line) => line.startsWith("NR_CMS_DEPLOYMENT_PROFILE="));
  const profile = profileLine
    ?.slice("NR_CMS_DEPLOYMENT_PROFILE=".length)
    .trim()
    .replace(/^(?:"([^"]*)"|'([^']*)')$/u, "$1$2");
  if (!profile || !["development", "vendor", "client"].includes(profile)) {
    throw new Error("retired_rollout_env_profile_invalid");
  }

  if (removed.length === 0) {
    console.log(`Prompt 18 rollout flags already absent: ${envPath}`);
    return;
  }

  const output = `${kept.join("\r\n").replace(/(?:\r\n)+$/u, "")}\r\n`;
  const handle = await open(envPath, "r+");
  try {
    const bytes = Buffer.from(output, "utf8");
    await handle.write(bytes, 0, bytes.length, 0);
    await handle.truncate(bytes.length);
    await handle.sync();
  } finally {
    await handle.close();
  }

  console.log(`Retired ${removed.length} completed Prompt 18 rollout flags: ${envPath}`);
}
