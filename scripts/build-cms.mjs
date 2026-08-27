import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const buildPhase = process.env.NR_CMS_ENV_PHASE === "build";

if (buildPhase) {
  // Build sandbox: public-only contract. It must never load runtime .env or
  // run the DB-aware deploy verifier.
  await run(
    process.execPath,
    [resolve(root, "scripts", "deploy-verify-build.mjs")],
    publicBuildEnvironment(process.env),
  );
} else {
  await run(process.execPath, [resolve(root, "scripts", "prepare-dev-runtime.mjs")]);
}
await run(process.execPath, [resolve(root, "node_modules", "next", "dist", "bin", "next"), "build"]);

function run(command, args, env = process.env) { return new Promise((resolveRun, reject) => { const child = spawn(command, args, { cwd: root, env, shell: false, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`cms_build_command_failed:${code}`))); }); }

function publicBuildEnvironment(env) {
  const allowed = new Set([
    "CI", "NODE_ENV", "NR_ADDON_SOURCE_MODE", "NR_CMS_DEPLOYMENT_PROFILE",
    "NR_CMS_ENV_PHASE", "NR_CMS_EXPECTED_HOSTNAME", "NR_CMS_RELEASE_SHA",
    "VERCEL_GIT_COMMIT_SHA", "GITHUB_SHA",
    "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "PATH", "Path", "PATHEXT", "SystemRoot",
    "TEMP", "TMP", "TMPDIR", "WINDIR",
  ]);
  return Object.fromEntries(Object.entries(env).filter(([name]) => allowed.has(name)));
}
