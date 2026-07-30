import { describe, expect, it } from "vitest";

import { analyzeVaultPasswords, type PasswordHealthInput } from "@/lib/password-health";

const now = new Date("2026-07-30T00:00:00.000Z");

function entry(overrides: Partial<PasswordHealthInput> = {}): PasswordHealthInput {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || "Layanan",
    password: overrides.password || "frasa sandi unik yang sangat panjang",
    passwordUpdatedAt:
      "passwordUpdatedAt" in overrides ? overrides.passwordUpdatedAt : "2026-07-01T00:00:00.000Z",
    createdAt: overrides.createdAt || "2026-01-01T00:00:00.000Z",
  };
}

describe("password health analyzer", () => {
  it("menandai password lemah tanpa mengembalikan plaintext", () => {
    const report = analyzeVaultPasswords([entry({ password: "password123" })], { now });

    expect(report).toMatchObject({ total: 1, risk: 1, weak: 1 });
    expect(report.entries[0]).toMatchObject({ status: "risk", weak: true });
    expect(JSON.stringify(report)).not.toContain("password123");
  });

  it("menandai seluruh entry yang menggunakan password sama", () => {
    const reusedPassword = "unik-tetapi-dipakai-ulang-pada-dua-akun";
    const report = analyzeVaultPasswords(
      [
        entry({ id: "entry-1", password: reusedPassword }),
        entry({ id: "entry-2", password: reusedPassword }),
      ],
      { now },
    );

    expect(report.reused).toBe(2);
    expect(report.entries.every((item) => item.reused && item.status === "risk")).toBe(true);
  });

  it("menjadikan umur password sebagai pengingat, bukan risiko otomatis", () => {
    const report = analyzeVaultPasswords(
      [
        entry({
          password: "frasa unik dan panjang sekali untuk pengujian",
          passwordUpdatedAt: "2025-12-01T00:00:00.000Z",
        }),
      ],
      { now, reviewAfterDays: 180 },
    );

    expect(report).toMatchObject({ risk: 0, review: 1 });
    expect(report.entries[0]).toMatchObject({
      status: "review",
      reviewDue: true,
      weak: false,
    });
  });

  it("memakai tanggal pembuatan sebagai fallback untuk entry lama", () => {
    const report = analyzeVaultPasswords(
      [
        entry({
          passwordUpdatedAt: undefined,
          createdAt: "2025-01-01T00:00:00.000Z",
        }),
      ],
      { now },
    );

    expect(report.entries[0].reviewDue).toBe(true);
  });
});
