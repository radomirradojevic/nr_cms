import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Private add-on checkouts are separate repositories with their own lint
    // gates. The public CMS lint result must not depend on whether they happen
    // to be mounted beside it on a developer or deployment machine.
    ".private/**",
    // Local diagnostics, extracted release packages, and audit evidence are
    // generated inputs/outputs rather than repository source.
    ".tmp/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
