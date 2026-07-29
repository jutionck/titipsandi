import { describe, expect, it } from "vitest";
import {
  createEmailVerificationToken,
  emailVerificationUrl,
  hashEmailVerificationToken,
  isEmailVerificationToken,
} from "@/lib/email-verification";

describe("email verification token", () => {
  it("creates a single-use token representation suitable for hash-only storage", () => {
    const generated = createEmailVerificationToken();
    expect(isEmailVerificationToken(generated.token)).toBe(true);
    expect(generated.tokenHash).toBe(hashEmailVerificationToken(generated.token));
    expect(generated.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(generated.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("keeps the token in the URL fragment", () => {
    const { token } = createEmailVerificationToken();
    expect(emailVerificationUrl(token, "https://titipsandi.test")).toBe(
      `https://titipsandi.test/verify-email#token=${token}`,
    );
  });
});
