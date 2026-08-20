import { createHash } from "node:crypto";
import { chmod, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SOURCE = resolve("scripts/night-raven-staging-scenario-runner.mjs");
const MAX_GITHUB_SECRET_BYTES = 47 * 1024;

function outsideWorkspace(candidate, cwd) {
  const relation = relative(resolve(cwd), resolve(candidate));
  return (
    relation !== "" &&
    (relation === ".." ||
      relation.startsWith(`..${sep}`) ||
      isAbsolute(relation))
  );
}

export function parseBuildArguments(args) {
  if (args.length !== 2 || args[0] !== "--output" || !args[1])
    throw new Error("Usage: --output <absolute-path-outside-workspace>.");
  if (!isAbsolute(args[1]))
    throw new Error("Runner output path must be absolute.");
  return { output: resolve(args[1]) };
}

export async function buildRunnerArtifact({ output, cwd = process.cwd() }) {
  if (!outsideWorkspace(output, cwd))
    throw new Error(
      "Runner output path must be outside the workspace checkout.",
    );
  const canonicalParent = await realpath(dirname(output));
  if (!outsideWorkspace(canonicalParent, cwd))
    throw new Error(
      "Runner output parent must resolve outside the workspace checkout.",
    );
  const bytes = await readFile(SOURCE);
  if (bytes.length === 0 || bytes.length > MAX_GITHUB_SECRET_BYTES)
    throw new Error(
      "Runner source does not fit the protected GitHub secret contract.",
    );
  await writeFile(output, bytes, { flag: "wx", mode: 0o700 });
  await chmod(output, 0o700);
  const written = await readFile(output);
  const sha256 = createHash("sha256").update(written).digest("hex");
  return { output, bytes: written.length, sha256 };
}

async function main() {
  const result = await buildRunnerArtifact({
    ...parseBuildArguments(process.argv.slice(2)),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    process.stderr.write(`[staging-runner-build] ${error.message}\n`);
    process.exitCode = 1;
  });
}
