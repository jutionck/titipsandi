import { describe, expect, it } from "vitest";

import { generateRecoveryCodes, normalizeRecoveryCode, totpCode, verifyTotpCode } from "@/lib/totp";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("TOTP", () => {
  it.each([
    [59_000, "287082"],
    [1_111_111_109_000, "081804"],
    [1_234_567_890_000, "005924"],
    [2_000_000_000_000, "279037"],
  ])("matches the six-digit RFC 6238 vectors at %i", (timestamp, expected) => {
    expect(totpCode(RFC_SECRET, timestamp)).toBe(expected);
  });

  it("accepts only the current code and the adjacent clock-drift window", () => {
    const timestamp = 1_234_567_890_000;
    expect(verifyTotpCode(RFC_SECRET, totpCode(RFC_SECRET, timestamp), timestamp)).toBe(true);
    expect(verifyTotpCode(RFC_SECRET, totpCode(RFC_SECRET, timestamp - 30_000), timestamp)).toBe(
      true,
    );
    expect(verifyTotpCode(RFC_SECRET, totpCode(RFC_SECRET, timestamp - 60_000), timestamp)).toBe(
      false,
    );
  });
});

describe("MFA recovery codes", () => {
  it("generates unique normalized codes without ambiguous characters", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){2}$/u.test(code))).toBe(true);
    expect(normalizeRecoveryCode(codes[0].toLowerCase().replaceAll("-", " "))).toBe(codes[0]);
  });
});
