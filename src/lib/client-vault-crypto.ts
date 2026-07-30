const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export const CLIENT_VAULT_CRYPTO_VERSION = 1 as const;
export const CLIENT_VAULT_KDF_ITERATIONS = 600_000 as const;

const AES_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const KDF_SALT_BYTES = 16;
const GCM_TAG_BYTES = 16;

export type ClientVaultKdf = {
  name: "PBKDF2-SHA256";
  iterations: typeof CLIENT_VAULT_KDF_ITERATIONS;
  salt: string;
};

export type ProtectedVaultKey = {
  version: typeof CLIENT_VAULT_CRYPTO_VERSION;
  algorithm: "AES-256-GCM";
  purpose: "password" | "recovery" | "emergency";
  kdf: ClientVaultKdf;
  iv: string;
  ciphertext: string;
};

export type ClientEncryptedVaultPayload = {
  version: typeof CLIENT_VAULT_CRYPTO_VERSION;
  algorithm: "AES-256-GCM";
  iv: string;
  ciphertext: string;
};

export type ClientVaultPayload = {
  category: string;
  title: string;
  username: string | null;
  email: string | null;
  password: string;
  pin: string | null;
  url: string | null;
  notes: string | null;
};

function webCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API tidak tersedia.");
  }

  return globalThis.crypto;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return webCrypto().getRandomValues(new Uint8Array(length));
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: unknown, label: string): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string" || value.length === 0 || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error(`${label} tidak valid.`);
  }

  const padding = (4 - (value.length % 4)) % 4;
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(padding);

  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error(`${label} tidak valid.`);
  }
}

function assertLength(
  bytes: Uint8Array<ArrayBuffer>,
  expected: number,
  label: string,
): Uint8Array<ArrayBuffer> {
  if (bytes.byteLength !== expected) {
    throw new Error(`${label} tidak valid.`);
  }

  return bytes;
}

function protectedKeyAad(
  userId: string,
  purpose: ProtectedVaultKey["purpose"],
  kdf: ClientVaultKdf,
) {
  return encoder.encode(
    [
      "titipsandi",
      "protected-vault-key",
      `v${CLIENT_VAULT_CRYPTO_VERSION}`,
      purpose,
      userId,
      kdf.name,
      kdf.iterations,
      kdf.salt,
    ].join(":"),
  );
}

function vaultEntryAad(userId: string, entryId: string) {
  return encoder.encode(
    ["titipsandi", "vault-entry", `v${CLIENT_VAULT_CRYPTO_VERSION}`, userId, entryId].join(":"),
  );
}

function validateContext(value: string, label: string) {
  if (!value || value.includes(":")) {
    throw new Error(`${label} tidak valid.`);
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isClientVaultPayload(value: unknown): value is ClientVaultPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ClientVaultPayload>;

  return (
    typeof candidate.category === "string" &&
    typeof candidate.title === "string" &&
    isNullableString(candidate.username) &&
    isNullableString(candidate.email) &&
    typeof candidate.password === "string" &&
    isNullableString(candidate.pin) &&
    isNullableString(candidate.url) &&
    isNullableString(candidate.notes)
  );
}

function parseKdf(value: unknown): ClientVaultKdf {
  if (!value || typeof value !== "object") {
    throw new Error("Konfigurasi KDF tidak valid.");
  }

  const candidate = value as Partial<ClientVaultKdf>;

  if (candidate.name !== "PBKDF2-SHA256" || candidate.iterations !== CLIENT_VAULT_KDF_ITERATIONS) {
    throw new Error("Konfigurasi KDF tidak didukung.");
  }

  assertLength(fromBase64Url(candidate.salt, "Salt KDF"), KDF_SALT_BYTES, "Salt KDF");

  return candidate as ClientVaultKdf;
}

function parseProtectedVaultKey(
  value: unknown,
  expectedPurpose?: ProtectedVaultKey["purpose"],
): {
  envelope: ProtectedVaultKey;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
} {
  if (!value || typeof value !== "object") {
    throw new Error("Envelope kunci vault tidak valid.");
  }

  const candidate = value as Partial<ProtectedVaultKey>;

  if (
    candidate.version !== CLIENT_VAULT_CRYPTO_VERSION ||
    candidate.algorithm !== "AES-256-GCM" ||
    (candidate.purpose !== "password" &&
      candidate.purpose !== "recovery" &&
      candidate.purpose !== "emergency") ||
    (expectedPurpose && candidate.purpose !== expectedPurpose)
  ) {
    throw new Error("Versi enkripsi kunci vault tidak didukung.");
  }

  const kdf = parseKdf(candidate.kdf);
  const iv = assertLength(fromBase64Url(candidate.iv, "IV"), GCM_IV_BYTES, "IV");
  const ciphertext = fromBase64Url(candidate.ciphertext, "Ciphertext");

  if (ciphertext.byteLength !== AES_KEY_BYTES + GCM_TAG_BYTES) {
    throw new Error("Ciphertext kunci vault tidak valid.");
  }

  return {
    envelope: { ...(candidate as ProtectedVaultKey), kdf },
    iv,
    ciphertext,
  };
}

export function validateProtectedVaultKey(
  value: unknown,
  expectedPurpose?: ProtectedVaultKey["purpose"],
): ProtectedVaultKey {
  return parseProtectedVaultKey(value, expectedPurpose).envelope;
}

function parseEncryptedPayload(value: unknown): {
  envelope: ClientEncryptedVaultPayload;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
} {
  if (!value || typeof value !== "object") {
    throw new Error("Envelope entry vault tidak valid.");
  }

  const candidate = value as Partial<ClientEncryptedVaultPayload>;

  if (candidate.version !== CLIENT_VAULT_CRYPTO_VERSION || candidate.algorithm !== "AES-256-GCM") {
    throw new Error("Versi enkripsi entry vault tidak didukung.");
  }

  const iv = assertLength(fromBase64Url(candidate.iv, "IV"), GCM_IV_BYTES, "IV");
  const ciphertext = fromBase64Url(candidate.ciphertext, "Ciphertext");

  if (ciphertext.byteLength <= GCM_TAG_BYTES) {
    throw new Error("Ciphertext entry vault tidak valid.");
  }

  return {
    envelope: candidate as ClientEncryptedVaultPayload,
    iv,
    ciphertext,
  };
}

export function validateClientEncryptedVaultPayload(value: unknown): ClientEncryptedVaultPayload {
  return parseEncryptedPayload(value).envelope;
}

async function deriveKeyEncryptionKey(secret: string, kdf: ClientVaultKdf) {
  if (!secret) {
    throw new Error("Rahasia pembungkus tidak boleh kosong.");
  }

  const crypto = webCrypto();
  const passwordMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromBase64Url(kdf.salt, "Salt KDF"),
      iterations: kdf.iterations,
    },
    passwordMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function importVaultKey(rawKey: Uint8Array<ArrayBuffer>) {
  return webCrypto().subtle.importKey("raw", rawKey, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportVaultKeyForTab(vaultKey: CryptoKey) {
  const rawKey = new Uint8Array(await webCrypto().subtle.exportKey("raw", vaultKey));
  assertLength(rawKey, AES_KEY_BYTES, "Kunci vault");
  return toBase64Url(rawKey);
}

export async function importVaultKeyForTab(encodedKey: string) {
  const rawKey = assertLength(
    fromBase64Url(encodedKey, "Kunci vault tab"),
    AES_KEY_BYTES,
    "Kunci vault tab",
  );
  return importVaultKey(rawKey);
}

export function createEmergencyAccessCode() {
  return toBase64Url(randomBytes(AES_KEY_BYTES));
}

export async function hashEmergencyAccessCode(code: string) {
  const digest = await webCrypto().subtle.digest("SHA-256", encoder.encode(code.trim()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function deriveAuthenticationSecret(password: string, email: string) {
  if (!password) throw new Error("Password tidak boleh kosong.");
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email tidak valid.");

  const salt = await webCrypto().subtle.digest(
    "SHA-256",
    encoder.encode(`titipsandi:authentication:v1:${normalizedEmail}`),
  );
  const material = await webCrypto().subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await webCrypto().subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: CLIENT_VAULT_KDF_ITERATIONS,
    },
    material,
    256,
  );
  return toBase64Url(new Uint8Array(derived));
}

export async function createEmergencyVaultKey(
  vaultKey: CryptoKey,
  accessCode: string,
  userId: string,
  contactId: string,
) {
  validateContext(userId, "ID pengguna");
  validateContext(contactId, "ID kontak");
  const rawVaultKey = new Uint8Array(await webCrypto().subtle.exportKey("raw", vaultKey));

  try {
    return await protectRawVaultKey(
      rawVaultKey,
      accessCode.trim(),
      `${userId}.${contactId}`,
      "emergency",
    );
  } finally {
    rawVaultKey.fill(0);
  }
}

export async function unlockEmergencyVaultKey(
  accessCode: string,
  userId: string,
  contactId: string,
  emergencyVaultKey: unknown,
) {
  validateContext(userId, "ID pengguna");
  validateContext(contactId, "ID kontak");
  const contextId = `${userId}.${contactId}`;
  const { envelope, iv, ciphertext } = parseProtectedVaultKey(emergencyVaultKey, "emergency");
  const keyEncryptionKey = await deriveKeyEncryptionKey(accessCode.trim(), envelope.kdf);
  const rawVaultKey = new Uint8Array(
    await webCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: protectedKeyAad(contextId, envelope.purpose, envelope.kdf),
        tagLength: 128,
      },
      keyEncryptionKey,
      ciphertext,
    ),
  );

  try {
    assertLength(rawVaultKey, AES_KEY_BYTES, "Kunci vault");
    return await importVaultKey(rawVaultKey);
  } finally {
    rawVaultKey.fill(0);
  }
}

export async function createProtectedVaultKey(password: string, userId: string) {
  validateContext(userId, "ID pengguna");

  const rawVaultKey = randomBytes(AES_KEY_BYTES);
  const recoveryKey = toBase64Url(randomBytes(AES_KEY_BYTES));

  try {
    const [vaultKey, protectedVaultKey, recoveryVaultKey] = await Promise.all([
      importVaultKey(rawVaultKey),
      protectRawVaultKey(rawVaultKey, password, userId, "password"),
      protectRawVaultKey(rawVaultKey, recoveryKey, userId, "recovery"),
    ]);

    return {
      vaultKey,
      protectedVaultKey,
      recoveryKey,
      recoveryVaultKey,
    };
  } finally {
    rawVaultKey.fill(0);
  }
}

async function protectRawVaultKey(
  rawVaultKey: Uint8Array<ArrayBuffer>,
  secret: string,
  userId: string,
  purpose: ProtectedVaultKey["purpose"],
) {
  const kdf: ClientVaultKdf = {
    name: "PBKDF2-SHA256",
    iterations: CLIENT_VAULT_KDF_ITERATIONS,
    salt: toBase64Url(randomBytes(KDF_SALT_BYTES)),
  };
  const iv = randomBytes(GCM_IV_BYTES);

  const keyEncryptionKey = await deriveKeyEncryptionKey(secret, kdf);
  const ciphertext = await webCrypto().subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: protectedKeyAad(userId, purpose, kdf),
      tagLength: 128,
    },
    keyEncryptionKey,
    rawVaultKey,
  );

  return {
    version: CLIENT_VAULT_CRYPTO_VERSION,
    algorithm: "AES-256-GCM",
    purpose,
    kdf,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  } satisfies ProtectedVaultKey;
}

export async function unlockVaultKey(password: string, userId: string, protectedVaultKey: unknown) {
  validateContext(userId, "ID pengguna");

  const { envelope, iv, ciphertext } = parseProtectedVaultKey(protectedVaultKey, "password");
  const keyEncryptionKey = await deriveKeyEncryptionKey(password, envelope.kdf);
  const rawVaultKey = new Uint8Array(
    await webCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: protectedKeyAad(userId, envelope.purpose, envelope.kdf),
        tagLength: 128,
      },
      keyEncryptionKey,
      ciphertext,
    ),
  );

  try {
    assertLength(rawVaultKey, AES_KEY_BYTES, "Kunci vault");
    return await importVaultKey(rawVaultKey);
  } finally {
    rawVaultKey.fill(0);
  }
}

export async function recoverAndRewrapVaultKey(
  recoveryKey: string,
  newPassword: string,
  userId: string,
  recoveryVaultKey: unknown,
) {
  validateContext(userId, "ID pengguna");
  const { envelope, iv, ciphertext } = parseProtectedVaultKey(recoveryVaultKey, "recovery");
  const recoveryEncryptionKey = await deriveKeyEncryptionKey(recoveryKey.trim(), envelope.kdf);
  const rawVaultKey = new Uint8Array(
    await webCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: protectedKeyAad(userId, envelope.purpose, envelope.kdf),
        tagLength: 128,
      },
      recoveryEncryptionKey,
      ciphertext,
    ),
  );

  try {
    assertLength(rawVaultKey, AES_KEY_BYTES, "Kunci vault");
    const [vaultKey, protectedVaultKey] = await Promise.all([
      importVaultKey(rawVaultKey),
      protectRawVaultKey(rawVaultKey, newPassword, userId, "password"),
    ]);
    return { vaultKey, protectedVaultKey };
  } finally {
    rawVaultKey.fill(0);
  }
}

export async function encryptClientVaultPayload(
  vaultKey: CryptoKey,
  userId: string,
  entryId: string,
  payload: ClientVaultPayload,
): Promise<ClientEncryptedVaultPayload> {
  validateContext(userId, "ID pengguna");
  validateContext(entryId, "ID entry");

  const iv = randomBytes(GCM_IV_BYTES);
  const ciphertext = await webCrypto().subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: vaultEntryAad(userId, entryId),
      tagLength: 128,
    },
    vaultKey,
    encoder.encode(JSON.stringify(payload)),
  );

  return {
    version: CLIENT_VAULT_CRYPTO_VERSION,
    algorithm: "AES-256-GCM",
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function decryptClientVaultPayload(
  vaultKey: CryptoKey,
  userId: string,
  entryId: string,
  encryptedPayload: unknown,
): Promise<ClientVaultPayload> {
  validateContext(userId, "ID pengguna");
  validateContext(entryId, "ID entry");

  const { iv, ciphertext } = parseEncryptedPayload(encryptedPayload);
  const plaintext = await webCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: vaultEntryAad(userId, entryId),
      tagLength: 128,
    },
    vaultKey,
    ciphertext,
  );
  const parsed: unknown = JSON.parse(decoder.decode(plaintext));

  if (!isClientVaultPayload(parsed)) {
    throw new Error("Payload vault tidak valid.");
  }

  return parsed;
}
