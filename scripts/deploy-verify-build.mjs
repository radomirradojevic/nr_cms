import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const profile = process.env.NR_CMS_DEPLOYMENT_PROFILE;
const sourceMode = process.env.NR_ADDON_SOURCE_MODE;
const phase = process.env.NR_CMS_ENV_PHASE;

if (phase !== "build") throw new Error("deploy_verify_build_requires_build_phase");
if (!["vendor", "client", "paypal"].includes(profile ?? "")) throw new Error("deploy_verify_build_profile_invalid");
if (!["registry", "empty"].includes(sourceMode ?? "")) throw new Error("deploy_verify_build_source_mode_invalid");
for (const forbidden of ["DATABASE_URL", "POSTGRES_PASSWORD", "CLERK_SECRET_KEY", "PADDLE_API_KEY", "NR_LICENSE_SERVER_HMAC_SECRET", "NR_ADDON_DEPLOYMENT_WORKER_DATABASE_URL"]) if (process.env[forbidden]) throw new Error(`deploy_verify_build_secret_forbidden:${forbidden}`);
for (const path of [resolve(root, ".private"), resolve(root, ".env")]) if (existsSync(path)) throw new Error("deploy_verify_build_private_runtime_input_forbidden");
await assertPublicBuildEnvironment(profile);
await run(process.execPath, [resolve(root, "scripts", "generate-addon-registry.mjs")]);
await run(process.execPath, [resolve(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"]);

async function assertPublicBuildEnvironment(profile) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("deploy_verify_build_public_origin_missing");
  const url = new URL(appUrl);
  if (url.protocol !== "https:" || url.hostname !== `${profile}.nr.test` || url.port || url.pathname !== "/" || url.username || url.password || url.search || url.hash) throw new Error("deploy_verify_build_public_origin_invalid");
  for (const name of ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]) if (!process.env[name]) throw new Error(`deploy_verify_build_public_input_missing:${name}`);
  const registry = resolve(root, ".tmp", "addon-registry.json");
  if (sourceMode === "registry" && !existsSync(registry)) throw new Error("deploy_verify_build_registry_missing");
  if (existsSync(registry)) { const stat = await lstat(registry); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024) throw new Error("deploy_verify_build_registry_invalid"); await readFile(registry); }
}
function run(command, args) { return new Promise((resolveRun, reject) => { const child = spawn(command, args, { cwd: root, env: process.env, shell: false, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`deploy_verify_build_command_failed:${code}`))); }); }
