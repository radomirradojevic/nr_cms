import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const testFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.private/webshop/tests/webshop-domain.test.ts",
);

test(
  "private webshop domain tests",
  existsSync(testFile) ? undefined : { skip: true },
  async () => {
    if (existsSync(testFile)) {
      await import(pathToFileURL(testFile).href);
    }
  },
);
