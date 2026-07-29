import { beforeAll, describe, expect, it } from "vitest";
import type { VaultEntry } from "@/generated/prisma/client";
import { encryptVaultField, publicVaultEntry, publicVaultSummary } from "@/lib/vault-crypto";

describe("vault response shapes", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  it("keeps secret fields out of the vault summary", () => {
    const id = "entry-1";
    const entry: VaultEntry = {
      id,
      userId: "user-1",
      category: "email",
      title: encryptVaultField("title", "Email utama", id)!,
      username: encryptVaultField("username", "pengguna", id),
      email: encryptVaultField("email", "user@example.com", id),
      password: encryptVaultField("password", "rahasia", id)!,
      pin: encryptVaultField("pin", "123456", id),
      url: encryptVaultField("url", "https://example.com", id),
      notes: encryptVaultField("notes", "catatan privat", id),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };

    const summary = publicVaultSummary(entry);

    expect(summary).toEqual({
      id,
      category: "email",
      title: "Email utama",
      username: "pengguna",
      email: "user@example.com",
      hasPin: true,
      hasUrl: true,
      hasNotes: true,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
    expect(summary).not.toHaveProperty("password");
    expect(summary).not.toHaveProperty("pin");
    expect(summary).not.toHaveProperty("url");
    expect(summary).not.toHaveProperty("notes");

    expect(publicVaultEntry(entry)).toMatchObject({
      password: "rahasia",
      pin: "123456",
      url: "https://example.com",
      notes: "catatan privat",
    });
  });
});
