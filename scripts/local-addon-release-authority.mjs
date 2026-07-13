import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function withEphemeralAddonReleaseAuthority(callback) {
  if (typeof callback !== "function")
    throw new TypeError("An ephemeral release authority callback is required.");
  const directory = await mkdtemp(join(tmpdir(), "nr-addon-release-authority-"));
  const privateKeyFile = join(directory, "authority.pk8.pem");
  const publicKeysFile = join(directory, "public-keys.json");
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyMaterial = Buffer.from(
    privateKey.export({ format: "pem", type: "pkcs8" }),
  );
  const publicKeyPem = publicKey
    .export({ format: "pem", type: "spki" })
    .toString();
  const kid = `local-acceptance:${createHash("sha256")
    .update(publicKeyPem)
    .digest("hex")
    .slice(0, 16)}`;
  const publicKeys = { [kid]: publicKeyPem };

  try {
    await writeFile(privateKeyFile, privateKeyMaterial, { mode: 0o600 });
    await writeFile(publicKeysFile, `${JSON.stringify(publicKeys, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    return await callback({
      env: {
        NR_ADDON_RELEASE_AUTHORITY_MODE: "ephemeral-local-acceptance",
        NR_ADDON_RELEASE_PUBLIC_KEYS_FILE: publicKeysFile,
        NR_ADDON_RELEASE_SIGNING_KEY_FILE: privateKeyFile,
        NR_ADDON_RELEASE_SIGNING_KID: kid,
      },
      kid,
      publicKeys,
      publicKeysFile,
    });
  } finally {
    privateKeyMaterial.fill(0);
    await rm(directory, { force: true, recursive: true });
  }
}
