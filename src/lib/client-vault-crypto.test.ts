import { describe, expect, it } from "vitest";

import {
  createProtectedVaultKey,
  createEmergencyAccessCode,
  createEmergencyVaultKey,
  decryptClientVaultPayload,
  deriveAuthenticationSecret,
  encryptClientVaultPayload,
  recoverAndRewrapVaultKey,
  hashEmergencyAccessCode,
  unlockEmergencyVaultKey,
  unlockVaultKey,
  type ClientVaultPayload,
} from "@/lib/client-vault-crypto";

const userId = "019fac47-1041-7fb0-81c8-0e1e3b705724";
const entryId = "entry-019fac47";
const password = "correct horse battery staple";
const payload: ClientVaultPayload = {
  category: "login",
  title: "Email utama",
  username: "jution",
  email: "jution@example.com",
  password: "sangat-rahasia",
  pin: null,
  url: "https://example.com",
  notes: "Hanya untuk pengujian",
};

describe("client vault crypto", () => {
  it("melindungi kunci vault dan melakukan round-trip payload", async () => {
    const { vaultKey, protectedVaultKey } = await createProtectedVaultKey(password, userId);
    const encrypted = await encryptClientVaultPayload(vaultKey, userId, entryId, payload);
    const unlockedKey = await unlockVaultKey(password, userId, protectedVaultKey);

    await expect(
      decryptClientVaultPayload(unlockedKey, userId, entryId, encrypted),
    ).resolves.toEqual(payload);
  });

  it("menolak password yang salah", async () => {
    const { protectedVaultKey } = await createProtectedVaultKey(password, userId);

    await expect(
      unlockVaultKey("password-yang-salah", userId, protectedVaultKey),
    ).rejects.toThrow();
  });

  it("memulihkan kunci vault dan membungkusnya dengan password baru", async () => {
    const created = await createProtectedVaultKey(password, userId);
    const encrypted = await encryptClientVaultPayload(created.vaultKey, userId, entryId, payload);
    const recovered = await recoverAndRewrapVaultKey(
      created.recoveryKey,
      "password baru yang sangat aman",
      userId,
      created.recoveryVaultKey,
    );
    const unlocked = await unlockVaultKey(
      "password baru yang sangat aman",
      userId,
      recovered.protectedVaultKey,
    );

    await expect(decryptClientVaultPayload(unlocked, userId, entryId, encrypted)).resolves.toEqual(
      payload,
    );
  });

  it("menolak recovery key yang salah dan envelope dengan purpose berbeda", async () => {
    const created = await createProtectedVaultKey(password, userId);

    await expect(
      recoverAndRewrapVaultKey(
        "recovery-key-yang-salah",
        "password baru yang sangat aman",
        userId,
        created.recoveryVaultKey,
      ),
    ).rejects.toThrow();
    await expect(
      recoverAndRewrapVaultKey(
        created.recoveryKey,
        "password baru yang sangat aman",
        userId,
        created.protectedVaultKey,
      ),
    ).rejects.toThrow();
  });

  it("mengikat ciphertext ke pengguna dan entry asalnya", async () => {
    const { vaultKey } = await createProtectedVaultKey(password, userId);
    const encrypted = await encryptClientVaultPayload(vaultKey, userId, entryId, payload);

    await expect(
      decryptClientVaultPayload(vaultKey, userId, "entry-lain", encrypted),
    ).rejects.toThrow();
    await expect(
      decryptClientVaultPayload(vaultKey, "pengguna-lain", entryId, encrypted),
    ).rejects.toThrow();
  });

  it("menolak ciphertext yang dimanipulasi", async () => {
    const { vaultKey } = await createProtectedVaultKey(password, userId);
    const encrypted = await encryptClientVaultPayload(vaultKey, userId, entryId, payload);
    const tampered = {
      ...encrypted,
      ciphertext: `${encrypted.ciphertext.startsWith("A") ? "B" : "A"}${encrypted.ciphertext.slice(1)}`,
    };

    await expect(decryptClientVaultPayload(vaultKey, userId, entryId, tampered)).rejects.toThrow();
  });

  it("menolak plaintext terautentikasi yang strukturnya bukan payload vault", async () => {
    const { vaultKey } = await createProtectedVaultKey(password, userId);
    const invalidPayload = { ...payload, notes: undefined } as unknown as ClientVaultPayload;
    const encrypted = await encryptClientVaultPayload(vaultKey, userId, entryId, invalidPayload);

    await expect(decryptClientVaultPayload(vaultKey, userId, entryId, encrypted)).rejects.toThrow(
      "Payload vault tidak valid.",
    );
  });

  it("menggunakan salt dan IV baru untuk setiap pembuatan", async () => {
    const first = await createProtectedVaultKey(password, userId);
    const second = await createProtectedVaultKey(password, userId);
    const firstEntry = await encryptClientVaultPayload(first.vaultKey, userId, entryId, payload);
    const secondEntry = await encryptClientVaultPayload(first.vaultKey, userId, entryId, payload);

    expect(first.protectedVaultKey.kdf.salt).not.toBe(second.protectedVaultKey.kdf.salt);
    expect(first.protectedVaultKey.iv).not.toBe(second.protectedVaultKey.iv);
    expect(firstEntry.iv).not.toBe(secondEntry.iv);
    expect(firstEntry.ciphertext).not.toBe(secondEntry.ciphertext);
  });

  it("menurunkan authentication secret deterministik tanpa memakai password mentah", async () => {
    const first = await deriveAuthenticationSecret(password, " User@Example.com ");
    const second = await deriveAuthenticationSecret(password, "user@example.com");
    const different = await deriveAuthenticationSecret("password berbeda", "user@example.com");

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first).not.toContain(password);
    expect(different).not.toBe(first);
  });

  it("membungkus vault untuk kontak darurat tanpa mengirim kode asli", async () => {
    const created = await createProtectedVaultKey(password, userId);
    const accessCode = createEmergencyAccessCode();
    const contactId = "contact-019fac47";
    const [codeHash, emergencyVaultKey] = await Promise.all([
      hashEmergencyAccessCode(accessCode),
      createEmergencyVaultKey(created.vaultKey, accessCode, userId, contactId),
    ]);
    const unlocked = await unlockEmergencyVaultKey(
      accessCode,
      userId,
      contactId,
      emergencyVaultKey,
    );
    const encrypted = await encryptClientVaultPayload(created.vaultKey, userId, entryId, payload);

    expect(codeHash).toMatch(/^[a-f0-9]{64}$/u);
    await expect(decryptClientVaultPayload(unlocked, userId, entryId, encrypted)).resolves.toEqual(
      payload,
    );
    await expect(
      unlockEmergencyVaultKey(accessCode, userId, "kontak-lain", emergencyVaultKey),
    ).rejects.toThrow();
  });
});
