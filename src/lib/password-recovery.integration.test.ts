import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { expect, it } from "vitest";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? it : it.skip;

databaseTest("consumes a recovery token once and revokes existing sessions", async () => {
  process.env.ENCRYPTION_KEY = "b".repeat(64);
  const { POST } = await import("@/app/api/auth/recovery/reset/route");
  const { createProtectedVaultKey, deriveAuthenticationSecret } =
    await import("@/lib/client-vault-crypto");
  const { createPasswordResetToken } = await import("@/lib/password-recovery");
  const { prisma } = await import("@/lib/prisma");
  const { clearRateLimits } = await import("@/lib/rate-limit");

  const id = crypto.randomUUID();
  const emailHash = crypto.randomUUID();
  const generated = createPasswordResetToken();
  const newPassword = "new-password-for-integration-test";
  const email = "integration@example.com";
  const [createdVault, authenticationSecret] = await Promise.all([
    createProtectedVaultKey(newPassword, id),
    deriveAuthenticationSecret(newPassword, email),
  ]);
  const clientIp = "198.51.100.25";

  try {
    await prisma.user.create({
      data: {
        id,
        name: "integration-test-only",
        email: "integration-test-only",
        emailHash,
        passwordHash: "integration-test-only",
        passwordResetTokens: {
          create: {
            tokenHash: generated.tokenHash,
            expiresAt: generated.expiresAt,
          },
        },
      },
    });

    const request = () =>
      new NextRequest("https://titipsandi.test/api/auth/recovery/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp,
        },
        body: JSON.stringify({
          token: generated.token,
          authenticationSecret,
          protectedVaultKey: createdVault.protectedVaultKey,
        }),
      });

    await expect(POST(request())).resolves.toMatchObject({ status: 200 });
    await expect(POST(request())).resolves.toMatchObject({ status: 400 });

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user.sessionVersion).toBe(1);
    await expect(bcrypt.compare(authenticationSecret, user.passwordHash)).resolves.toBe(true);
    expect(user.vaultKeyEnvelope).toEqual(createdVault.protectedVaultKey);
  } finally {
    await prisma.user.deleteMany({ where: { id } });
    await clearRateLimits([
      { scope: "recovery-reset-ip", identifier: clientIp },
      { scope: "recovery-reset-token", identifier: generated.tokenHash },
    ]);
  }
});
