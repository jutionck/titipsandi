import { describe, expect, it } from "vitest";
import {
  createLoginOtpChallenge,
  createLoginOtpCode,
  hashLoginOtpCode,
  hashLoginOtpToken,
  LOGIN_OTP_TTL_MS,
  loginOtpCodeMatches,
  maskEmail,
  validLoginOtpCode,
  validLoginOtpToken,
} from "@/lib/login-otp";

describe("login OTP", () => {
  it("creates a six-digit one-time code bound to a random challenge token", () => {
    const before = Date.now();
    const first = createLoginOtpChallenge();
    const second = createLoginOtpChallenge();

    expect(validLoginOtpToken(first.token)).toBe(true);
    expect(validLoginOtpCode(first.code)).toBe(true);
    expect(first.token).not.toBe(second.token);
    expect(first.codeHash).toBe(hashLoginOtpCode(first.token, first.code));
    expect(first.tokenHash).toBe(hashLoginOtpToken(first.token));
    expect(first.expiresAt.getTime()).toBeGreaterThanOrEqual(before + LOGIN_OTP_TTL_MS - 100);
  });

  it("rejects a code copied to a different challenge or changed by one digit", () => {
    const first = createLoginOtpChallenge();
    const second = createLoginOtpChallenge();

    expect(loginOtpCodeMatches(first.token, first.code, first.codeHash)).toBe(true);
    expect(loginOtpCodeMatches(second.token, first.code, first.codeHash)).toBe(false);
    expect(loginOtpCodeMatches(first.token, "999999", first.codeHash)).toBe(
      first.code === "999999",
    );
  });

  it("rotates the code while keeping the same challenge token", () => {
    const challenge = createLoginOtpChallenge();
    const rotated = createLoginOtpCode(challenge.token);

    expect(validLoginOtpCode(rotated.code)).toBe(true);
    expect(loginOtpCodeMatches(challenge.token, rotated.code, rotated.codeHash)).toBe(true);
  });

  it("masks the email without hiding its destination domain", () => {
    expect(maskEmail("pengguna@example.com")).toBe("pe******@example.com");
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
    expect(maskEmail("invalid")).toBe("***");
  });
});
