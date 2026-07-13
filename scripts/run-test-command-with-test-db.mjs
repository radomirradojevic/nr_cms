import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";

import { resolveTestDatabaseUrl } from "./database-test-safety.mjs";

// Private packages invoke this runner from their own directory. Always load
// the root-owned test configuration instead of silently inheriting an
// arbitrary package-local environment file.
const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
loadEnv({ path: resolve(repositoryRoot, ".env") });

const [command, ...commandArgs] = process.argv.slice(2);

if (!command) {
  throw new Error(
    "Usage: node scripts/run-test-command-with-test-db.mjs <command> [args...]",
  );
}

const executable = command === "npm" || command === "npx" ? process.execPath : command;
const executableArgs =
  command === "npm"
    ? [resolve(process.execPath, "..", "node_modules", "npm", "bin", "npm-cli.js"), ...commandArgs]
    : command === "npx"
      ? [resolve(process.execPath, "..", "node_modules", "npm", "bin", "npx-cli.js"), ...commandArgs]
      : commandArgs;
const testDatabaseUrl = resolveTestDatabaseUrl();
const child = spawn(executable, executableArgs, {
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    NODE_ENV: "test",
    TEST_DATABASE_URL: testDatabaseUrl,
  },
  shell: false,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`[test-database] could not start test command: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[test-database] test command ended from signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
