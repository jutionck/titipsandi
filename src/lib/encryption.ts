import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const LEGACY_VERSION = "v1";
const DERIVED_KEY_VERSION = "v2";
const KEY_FINGERPRINT_LENGTH = 24;
const MAX_PREVIOUS_KEYS = 8;

type KeyMaterial = {
  fingerprint: string;
  masterKey: Buffer;
};

function parseKey(value: string | undefined, variableName: string): Buffer {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(`${variableName} wajib berupa 32-byte hex (64 karakter).`);
  }
  return Buffer.from(value, "hex");
}

function fingerprint(masterKey: Buffer) {
  return crypto
    .createHash("sha256")
    .update("titipsandi:key-fingerprint:v1\0")
    .update(masterKey)
    .digest("hex")
    .slice(0, KEY_FINGERPRINT_LENGTH);
}

function getKeyRing(): KeyMaterial[] {
  const activeKey = parseKey(process.env.ENCRYPTION_KEY, "ENCRYPTION_KEY");
  const previousValues = (process.env.ENCRYPTION_KEY_PREVIOUS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (previousValues.length > MAX_PREVIOUS_KEYS) {
    throw new Error(`ENCRYPTION_KEY_PREVIOUS maksimal memuat ${MAX_PREVIOUS_KEYS} key.`);
  }

  const keys = [
    activeKey,
    ...previousValues.map((value, index) => parseKey(value, `ENCRYPTION_KEY_PREVIOUS[${index}]`)),
  ];
  const uniqueKeys = new Map(keys.map((masterKey) => [fingerprint(masterKey), masterKey]));
  if (uniqueKeys.size !== keys.length) {
    throw new Error("Encryption key aktif dan sebelumnya tidak boleh duplikat.");
  }

  return [...uniqueKeys].map(([keyFingerprint, masterKey]) => ({
    fingerprint: keyFingerprint,
    masterKey,
  }));
}

function deriveSubkey(masterKey: Buffer, purpose: "field-encryption" | "blind-index") {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      masterKey,
      Buffer.from("titipsandi:hkdf:v2", "utf8"),
      Buffer.from(`titipsandi:${purpose}:v2`, "utf8"),
      32,
    ),
  );
}

function hmacIndex(value: string, context: string, key: Buffer) {
  return crypto.createHmac("sha256", key).update(`${context}\0${value}`).digest("hex");
}

export function blindIndex(value: string, context: string): string {
  const activeKey = getKeyRing()[0].masterKey;
  return hmacIndex(value, context, deriveSubkey(activeKey, "blind-index"));
}

export function blindIndexCandidates(value: string, context: string): string[] {
  return getKeyRing().map(({ masterKey }) =>
    hmacIndex(value, context, deriveSubkey(masterKey, "blind-index")),
  );
}

export function legacyBlindIndex(value: string, context: string): string {
  return hmacIndex(value, context, getKeyRing()[0].masterKey);
}

export function legacyBlindIndexCandidates(value: string, context: string): string[] {
  return getKeyRing().map(({ masterKey }) => hmacIndex(value, context, masterKey));
}

function writeVersion() {
  const version = process.env.ENCRYPTION_WRITE_VERSION?.trim() || LEGACY_VERSION;
  if (version !== LEGACY_VERSION && version !== DERIVED_KEY_VERSION) {
    throw new Error("ENCRYPTION_WRITE_VERSION hanya boleh bernilai v1 atau v2.");
  }
  return version;
}

function encryptWithKey(text: string, context: string, key: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(`brankas:${context}`, "utf8"));
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, encrypted };
}

export function encrypt(text: string, context: string): string {
  const activeKey = getKeyRing()[0];
  const version = writeVersion();
  const key =
    version === DERIVED_KEY_VERSION
      ? deriveSubkey(activeKey.masterKey, "field-encryption")
      : activeKey.masterKey;
  const { iv, tag, encrypted } = encryptWithKey(text, context, key);

  return (
    version === DERIVED_KEY_VERSION
      ? [
          version,
          activeKey.fingerprint,
          iv.toString("base64url"),
          tag.toString("base64url"),
          encrypted.toString("base64url"),
        ]
      : [
          version,
          iv.toString("base64url"),
          tag.toString("base64url"),
          encrypted.toString("base64url"),
        ]
  ).join(".");
}

function decryptWithKey(encrypted: Buffer, iv: Buffer, tag: Buffer, context: string, key: Buffer) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(`brankas:${context}`, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function validCipherParts(iv: Buffer, tag: Buffer) {
  return iv.length === IV_LENGTH && tag.length === TAG_LENGTH;
}

function decryptLegacy(parts: string[], context: string) {
  if (parts.length !== 4) throw new Error("Format ciphertext tidak valid.");
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const encrypted = Buffer.from(parts[3], "base64url");
  if (!validCipherParts(iv, tag)) throw new Error("Ciphertext rusak atau tidak valid.");

  for (const { masterKey } of getKeyRing()) {
    try {
      return decryptWithKey(encrypted, iv, tag, context, masterKey);
    } catch {
      // Ciphertext v1 has no key identifier, so every configured key must be tried.
    }
  }
  throw new Error("Ciphertext tidak dapat didekripsi dengan key yang tersedia.");
}

function decryptDerived(parts: string[], context: string) {
  if (parts.length !== 5) throw new Error("Format ciphertext tidak valid.");
  const keyMaterial = getKeyRing().find(({ fingerprint: value }) => value === parts[1]);
  if (!keyMaterial) throw new Error("Key untuk ciphertext tidak tersedia.");

  const iv = Buffer.from(parts[2], "base64url");
  const tag = Buffer.from(parts[3], "base64url");
  const encrypted = Buffer.from(parts[4], "base64url");
  if (!validCipherParts(iv, tag)) throw new Error("Ciphertext rusak atau tidak valid.");

  try {
    return decryptWithKey(
      encrypted,
      iv,
      tag,
      context,
      deriveSubkey(keyMaterial.masterKey, "field-encryption"),
    );
  } catch {
    throw new Error("Ciphertext tidak dapat didekripsi atau autentikasi gagal.");
  }
}

export function decrypt(encryptedText: string, context: string): string {
  const parts = encryptedText.split(".");
  if (parts[0] === LEGACY_VERSION) return decryptLegacy(parts, context);
  if (parts[0] === DERIVED_KEY_VERSION) return decryptDerived(parts, context);
  throw new Error("Format ciphertext tidak valid.");
}
