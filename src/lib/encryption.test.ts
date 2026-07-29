import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  blindIndex,
  blindIndexCandidates,
  decrypt,
  encrypt,
  legacyBlindIndex,
  legacyBlindIndexCandidates,
} from "@/lib/encryption";

const OLD_KEY = "1".repeat(64);
const NEW_KEY = "2".repeat(64);

beforeEach(() => {
  vi.stubEnv("ENCRYPTION_KEY", OLD_KEY);
  vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", "");
  vi.stubEnv("ENCRYPTION_WRITE_VERSION", "v1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("versioned encryption", () => {
  it("keeps writing and reading the legacy format by default", () => {
    const ciphertext = encrypt("rahasia", "vault.password:entry-1");

    expect(ciphertext).toMatch(/^v1\./);
    expect(decrypt(ciphertext, "vault.password:entry-1")).toBe("rahasia");
  });

  it("writes v2 with a derived encryption subkey when explicitly enabled", () => {
    vi.stubEnv("ENCRYPTION_WRITE_VERSION", "v2");
    const ciphertext = encrypt("rahasia", "vault.password:entry-1");

    expect(ciphertext).toMatch(/^v2\.[a-f0-9]{24}\./);
    expect(decrypt(ciphertext, "vault.password:entry-1")).toBe("rahasia");
  });

  it.each(["v1", "v2"])("decrypts %s ciphertext after its key becomes previous", (version) => {
    vi.stubEnv("ENCRYPTION_WRITE_VERSION", version);
    const ciphertext = encrypt("data lama", "vault.notes:entry-1");

    vi.stubEnv("ENCRYPTION_KEY", NEW_KEY);
    vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", OLD_KEY);

    expect(decrypt(ciphertext, "vault.notes:entry-1")).toBe("data lama");
  });

  it("binds both formats to their encryption context", () => {
    vi.stubEnv("ENCRYPTION_WRITE_VERSION", "v2");
    const ciphertext = encrypt("rahasia", "vault.password:entry-1");

    expect(() => decrypt(ciphertext, "vault.password:entry-2")).toThrow(
      "Ciphertext tidak dapat didekripsi",
    );
  });

  it("rejects an unsupported write version", () => {
    vi.stubEnv("ENCRYPTION_WRITE_VERSION", "v3");

    expect(() => encrypt("rahasia", "test")).toThrow(
      "ENCRYPTION_WRITE_VERSION hanya boleh bernilai v1 atau v2.",
    );
  });
});

describe("blind-index key separation", () => {
  it("uses different subkeys for current and legacy blind indexes", () => {
    const current = blindIndex("user@example.com", "user.email");
    const legacy = legacyBlindIndex("user@example.com", "user.email");

    expect(current).not.toBe(legacy);
    expect(current).toHaveLength(64);
    expect(legacy).toHaveLength(64);
  });

  it("keeps lookup candidates for previous keys during rotation", () => {
    const oldCurrent = blindIndex("user@example.com", "user.email");
    const oldLegacy = legacyBlindIndex("user@example.com", "user.email");

    vi.stubEnv("ENCRYPTION_KEY", NEW_KEY);
    vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", OLD_KEY);

    expect(blindIndexCandidates("user@example.com", "user.email")).toContain(oldCurrent);
    expect(legacyBlindIndexCandidates("user@example.com", "user.email")).toContain(oldLegacy);
  });

  it("deduplicates an active key repeated in the previous-key list", () => {
    vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", `${OLD_KEY},${OLD_KEY}`);

    expect(blindIndexCandidates("user@example.com", "user.email")).toHaveLength(1);
    expect(legacyBlindIndexCandidates("user@example.com", "user.email")).toHaveLength(1);
  });
});
