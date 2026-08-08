import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const child = spawn(
  process.execPath,
  [
    resolve(repositoryRoot, "scripts", "verify-webshop-schema-fixture.mjs"),
    "--run-payment-test",
  ],
  {
    cwd: repositoryRoot,
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
