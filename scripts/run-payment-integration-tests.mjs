import "dotenv/config";

import { spawn } from "node:child_process";
import process from "node:process";

import { resolveTestDatabaseUrl } from "./database-test-safety.mjs";

const child = spawn(
  process.execPath,
  [
    "node_modules/tsx/dist/cli.mjs",
    "--test",
    "tests/payment-state-v2.integration.test.mjs",
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: resolveTestDatabaseUrl(),
      NODE_ENV: "test",
    },
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  console.error(`[test-database] could not start payment integration tests: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
