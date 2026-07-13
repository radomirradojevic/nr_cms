import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  generateKeyPairSync as generatePair,
  verify,
} from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  canonicalAddonReleaseManifestPayload,
  signAddonReleaseManifest,
} from "../scripts/sign-addon-release-manifest.mjs";
import { withEphemeralAddonReleaseAuthority } from "../scripts/local-addon-release-authority.mjs";
import { assertPromotablePrivateRelease } from "../scripts/night-raven-acceptance-harness.mjs";

test("release signer produces an Ed25519 signature over every nested field", async () => {
  const root = mkdtempSync(join(tmpdir(), "nr-addon-signing-test-"));
  try {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const keyPath = join(root, "release-authority.pem");
    writeFileSync(
      keyPath,
      privateKey.export({ format: "pem", type: "pkcs8" }),
      { mode: 0o600 },
    );
    const unsigned = {
      manifestVersion: 1,
      signingKid: "release-test-v1",
      artifact: {
        files: [{ path: "dist/server.js", sha256: "a".repeat(64), size: 7 }],
        sha256: "b".repeat(64),
        size: 123,
      },
    };
    const manifest = await signAddonReleaseManifest({
      unsignedManifest: unsigned,
      privateKeyFile: keyPath,
      signingKid: "release-test-v1",
    });

    assert.match(manifest.signature, /^[A-Za-z0-9_-]{86}$/);
    assert.equal(
      assertPromotablePrivateRelease(manifest, "test-package", {
        "release-test-v1": publicKey
          .export({ format: "pem", type: "spki" })
          .toString(),
      }),
      manifest,
    );
    assert.equal(
      verify(
        null,
        Buffer.from(canonicalAddonReleaseManifestPayload(unsigned), "utf8"),
        publicKey,
        Buffer.from(manifest.signature, "base64url"),
      ),
      true,
    );
    assert.equal(
      verify(
        null,
        Buffer.from(
          canonicalAddonReleaseManifestPayload({
            ...unsigned,
            artifact: { ...unsigned.artifact, size: 124 },
          }),
          "utf8",
        ),
        publicKey,
        Buffer.from(manifest.signature, "base64url"),
      ),
      false,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("release signer rejects a non-Ed25519 authority and invalid kid", async () => {
  const root = mkdtempSync(join(tmpdir(), "nr-addon-signing-test-"));
  try {
    const { privateKey } = generatePair("rsa", { modulusLength: 2048 });
    const keyPath = join(root, "wrong-authority.pem");
    writeFileSync(
      keyPath,
      privateKey.export({ format: "pem", type: "pkcs8" }),
      { mode: 0o600 },
    );
    await assert.rejects(
      signAddonReleaseManifest({
        unsignedManifest: {},
        privateKeyFile: keyPath,
        signingKid: "release-test-v1",
      }),
      /Ed25519/,
    );
    await assert.rejects(
      signAddonReleaseManifest({
        unsignedManifest: {},
        privateKeyFile: keyPath,
        signingKid: "contains a space",
      }),
      /signing kid/i,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("local release authority exists only for the callback and exposes no key value", async () => {
  let privateKeyPath;
  await withEphemeralAddonReleaseAuthority(async (authority) => {
    privateKeyPath = authority.env.NR_ADDON_RELEASE_SIGNING_KEY_FILE;
    assert.equal(existsSync(privateKeyPath), true);
    assert.equal(
      Object.keys(authority.env).some((name) => /PRIVATE_KEY_VALUE|SIGNING_SECRET/.test(name)),
      false,
    );
    assert.deepEqual(
      JSON.parse(readFileSync(authority.publicKeysFile, "utf8")),
      authority.publicKeys,
    );
    assert.match(authority.kid, /^local-acceptance:[a-f0-9]{16}$/);
  });
  assert.equal(existsSync(privateKeyPath), false);
});
