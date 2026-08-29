import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CMS_PACKAGE_LOCK_VERSION,
  CMS_PACKAGE_VERSION,
  createCmsReleaseManifest,
} from "./cms-release-contract.mjs";

export function parseCmsReleaseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error("Expected --tag, --sha, and optional --output values");
    }
    if (values.has(name))
      throw new Error(`Duplicate CMS release option: ${name}`);
    values.set(name, value);
  }
  for (const name of values.keys()) {
    if (!["--output", "--sha", "--tag"].includes(name)) {
      throw new Error(`Unknown CMS release option: ${name}`);
    }
  }
  const tag = values.get("--tag");
  const commitSha = values.get("--sha");
  if (!tag || !commitSha) {
    throw new Error("CMS release verification requires --tag and --sha");
  }
  return { commitSha, output: values.get("--output"), tag };
}

export async function verifyCmsRelease(argv = process.argv.slice(2)) {
  const { commitSha, output, tag } = parseCmsReleaseArguments(argv);
  const manifest = createCmsReleaseManifest({
    commitSha,
    packageLockVersion: CMS_PACKAGE_LOCK_VERSION,
    packageVersion: CMS_PACKAGE_VERSION,
    tag,
  });
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  if (output) {
    const outputPath = resolve(output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes, { encoding: "utf8", flag: "wx" });
  } else {
    process.stdout.write(bytes);
  }
  return manifest;
}

async function main() {
  try {
    await verifyCmsRelease();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "CMS release verification failed",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
