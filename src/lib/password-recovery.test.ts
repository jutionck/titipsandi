import { describe, expect, it } from "vitest";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetToken,
  passwordResetUrl,
} from "@/lib/password-recovery";

describe("password recovery token", () => {
  it("creates a high-entropy token and stores only its deterministic hash", () => {
    const first = createPasswordResetToken();
    const second = createPasswordResetToken();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashPasswordResetToken(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(isPasswordResetToken(first.token)).toBe(true);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects malformed tokens and encodes valid tokens in a fixed-origin URL", () => {
    const { token } = createPasswordResetToken();

    expect(isPasswordResetToken("short")).toBe(false);
    expect(isPasswordResetToken(`${token}.extra`)).toBe(false);
    expect(passwordResetUrl(token, "https://titipsandi.test")).toBe(
      `https://titipsandi.test/recover#token=${token}`,
    );
  });
});
