import crypto from "node:crypto";
import { expect, it } from "vitest";

const appOrigin = process.env.TEST_APP_ORIGIN;
const databaseTest = process.env.RUN_DATABASE_TESTS === "1" && appOrigin ? it : it.skip;

databaseTest("accepts TOTP and creates an individual authenticated session", async () => {
  const { LOGIN_OTP_COOKIE } = await import("@/lib/auth");
  const { createLoginChallengeToken, hashLoginOtpToken } = await import("@/lib/login-otp");
  const { prisma } = await import("@/lib/prisma");
  const { clearRateLimits } = await import("@/lib/rate-limit");
  const { encryptTotpSecret, generateTotpSecret, totpCode } = await import("@/lib/totp");

  const userId = crypto.randomUUID();
  const token = createLoginChallengeToken();
  const tokenHash = hashLoginOtpToken(token);
  const secret = generateTotpSecret();
  const clientIp = "198.51.100.88";

  try {
    await prisma.user.create({
      data: {
        id: userId,
        name: "totp-login-integration",
        email: "totp-login-integration",
        emailHash: crypto.randomUUID(),
        passwordHash: "totp-login-integration",
        emailVerifiedAt: new Date(),
        totpSecret: encryptTotpSecret(secret, userId),
        totpEnabledAt: new Date(),
        loginOtpChallenges: {
          create: {
            tokenHash,
            codeHash: null,
            method: "TOTP",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        },
      },
    });

    const response = await fetch(`${appOrigin}/api/auth/login/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${LOGIN_OTP_COOKIE}=${token}`,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0",
        "X-Forwarded-For": clientIp,
      },
      body: JSON.stringify({ code: totpCode(secret) }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("titipsandi_session=");
    await expect(
      prisma.userSession.count({ where: { userId, method: "password_totp" } }),
    ).resolves.toBe(1);
    const challenge = await prisma.loginOtpChallenge.findUniqueOrThrow({
      where: { tokenHash },
    });
    expect(challenge.consumedAt).toBeInstanceOf(Date);
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    await clearRateLimits([
      { scope: "login-otp-verify-ip", identifier: clientIp },
      { scope: "login-otp-verify-token", identifier: tokenHash },
    ]);
  }
});

databaseTest("consumes an MFA recovery code exactly once", async () => {
  const { LOGIN_OTP_COOKIE } = await import("@/lib/auth");
  const { createLoginChallengeToken, hashLoginOtpToken } = await import("@/lib/login-otp");
  const { prisma } = await import("@/lib/prisma");
  const { clearRateLimits } = await import("@/lib/rate-limit");
  const { encryptTotpSecret, generateTotpSecret, recoveryCodeHash } = await import("@/lib/totp");

  const userId = crypto.randomUUID();
  const secret = generateTotpSecret();
  const recoveryCode = "ABCD-EFGH-IJKL";
  const firstToken = createLoginChallengeToken();
  const secondToken = createLoginChallengeToken();
  const firstTokenHash = hashLoginOtpToken(firstToken);
  const secondTokenHash = hashLoginOtpToken(secondToken);
  const clientIp = "198.51.100.89";

  async function verify(token: string) {
    return fetch(`${appOrigin}/api/auth/login/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${LOGIN_OTP_COOKIE}=${token}`,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0",
        "X-Forwarded-For": clientIp,
      },
      body: JSON.stringify({ code: recoveryCode }),
    });
  }

  try {
    await prisma.user.create({
      data: {
        id: userId,
        name: "recovery-code-integration",
        email: "recovery-code-integration",
        emailHash: crypto.randomUUID(),
        passwordHash: "recovery-code-integration",
        emailVerifiedAt: new Date(),
        totpSecret: encryptTotpSecret(secret, userId),
        totpEnabledAt: new Date(),
        recoveryCodes: {
          create: {
            codeHash: recoveryCodeHash(recoveryCode, userId),
          },
        },
        loginOtpChallenges: {
          create: {
            tokenHash: firstTokenHash,
            codeHash: null,
            method: "TOTP",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        },
      },
    });

    await expect(verify(firstToken)).resolves.toMatchObject({ status: 200 });
    const consumedCode = await prisma.mfaRecoveryCode.findFirstOrThrow({
      where: { userId },
    });
    expect(consumedCode.usedAt).toBeInstanceOf(Date);

    await prisma.loginOtpChallenge.create({
      data: {
        userId,
        tokenHash: secondTokenHash,
        codeHash: null,
        method: "TOTP",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    await expect(verify(secondToken)).resolves.toMatchObject({ status: 401 });
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    await clearRateLimits([
      { scope: "login-otp-verify-ip", identifier: clientIp },
      { scope: "login-otp-verify-token", identifier: firstTokenHash },
      { scope: "login-otp-verify-token", identifier: secondTokenHash },
    ]);
  }
});
