import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("local add-on deployer password input is create-only, RNG-backed and secret-silent", () => {
  const source = fs.readFileSync("scripts/provision-local-addon-deployer-password.ps1", "utf8");
  assert.match(source, /RandomNumberGenerator/);
  assert.match(source, /SetAccessRuleProtection\(\$true, \$false\)/);
  assert.match(source, /if \(-not \(Test-Path -LiteralPath \$path\)\)/);
  assert.match(source, /Move-Item -LiteralPath \$temporary -Destination \$path -ErrorAction Stop/);
  assert.doesNotMatch(source, /Write(?:-Output|-Host|Line)\([^\r\n]*\$value/i);
  assert.doesNotMatch(source, /-Force[^\r\n]*-Destination \$path/);
});
