import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const buildPhase = process.env.NR_CMS_ENV_PHASE === "build";

if (buildPhase) {
  // Build sandbox: public-only contract. It must never load runtime .env or
  // run the DB-aware deploy verifier.
  await run(process.execPath, [resolve(root, "scripts", "deploy-verify-build.mjs")]);
} else {
  await run(process.execPath, [resolve(root, "scripts", "prepare-dev-runtime.mjs")]);
}
await run(process.execPath, [resolve(root, "node_modules", "next", "dist", "bin", "next"), "build"]);

function run(command, args) { return new Promise((resolveRun, reject) => { const child = spawn(command, args, { cwd: root, env: process.env, shell: false, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`cms_build_command_failed:${code}`))); }); }
