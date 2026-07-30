import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import { isAuthenticationSecret, verifyAuthenticationSecret } from "@/lib/authentication-secret";

describe("authentication secret", () => {
  it("menerima secret turunan dan menolak Master Password mentah", async () => {
    const authenticationSecret = "A".repeat(43);
    const masterPassword = "correct horse battery staple";
    const passwordHash = await bcrypt.hash(authenticationSecret, 4);

    expect(isAuthenticationSecret(authenticationSecret)).toBe(true);
    expect(isAuthenticationSecret(masterPassword)).toBe(false);
    await expect(verifyAuthenticationSecret(authenticationSecret, passwordHash)).resolves.toBe(
      true,
    );
    await expect(verifyAuthenticationSecret(masterPassword, passwordHash)).resolves.toBe(false);
  });
});
