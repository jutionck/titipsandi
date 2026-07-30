import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { clearLoginOtpCookie, LOGIN_OTP_COOKIE, setSessionCookie, signToken } from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import {
  hashLoginOtpToken,
  LOGIN_OTP_MAX_ATTEMPTS,
  loginOtpCodeMatches,
  validLoginOtpCode,
  validLoginOtpToken,
} from "@/lib/login-otp";
import { prisma } from "@/lib/prisma";
import { clearRateLimits, enforceRateLimits } from "@/lib/rate-limit";
import { recordSecurityAuditEvent, SECURITY_AUDIT_ACTIONS } from "@/lib/security-audit";
import { requestDeviceLabel } from "@/lib/session-device";
import { USER_SESSION_TTL_MS } from "@/lib/session-policy";
import {
  decryptTotpSecret,
  normalizeRecoveryCode,
  recoveryCodeHash,
  verifyTotpCode,
} from "@/lib/totp";

const INVALID_OTP = "Kode OTP tidak valid atau sudah kedaluwarsa.";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 2 * 1024);
    if (!parsed.ok) return parsed.response;

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(LOGIN_OTP_COOKIE)?.value;
    const code = typeof parsed.value.code === "string" ? parsed.value.code.trim() : "";
    if (!validLoginOtpToken(challengeToken) || !code || code.length > 64) {
      const response = privateJson({ error: INVALID_OTP }, { status: 401 });
      clearLoginOtpCookie(response);
      return response;
    }

    const tokenHash = hashLoginOtpToken(challengeToken);
    const policies = [
      {
        scope: "login-otp-verify-ip",
        identifier: requestClientIp(req),
        limit: 20,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "login-otp-verify-token",
        identifier: tokenHash,
        limit: LOGIN_OTP_MAX_ATTEMPTS,
        windowMs: 15 * 60 * 1000,
      },
    ];
    const rateLimitResponse = await enforceRateLimits(policies);
    if (rateLimitResponse) return rateLimitResponse;

    const challenge = await prisma.loginOtpChallenge.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            sessionVersion: true,
            emailVerifiedAt: true,
            vaultKeyEnvelope: true,
            vaultCryptoVersion: true,
            totpSecret: true,
            totpEnabledAt: true,
          },
        },
      },
    });
    const now = new Date();
    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= LOGIN_OTP_MAX_ATTEMPTS ||
      !challenge.user.emailVerifiedAt
    ) {
      const response = privateJson({ error: INVALID_OTP }, { status: 401 });
      clearLoginOtpCookie(response);
      return response;
    }

    let validCode = false;
    let recoveryCodeId: string | null = null;
    if (challenge.method === "EMAIL") {
      validCode =
        validLoginOtpCode(code) &&
        loginOtpCodeMatches(challengeToken, code, challenge.codeHash ?? "");
    } else if (
      challenge.method === "TOTP" &&
      challenge.user.totpSecret &&
      challenge.user.totpEnabledAt
    ) {
      const normalizedRecoveryCode = normalizeRecoveryCode(code);
      if (normalizedRecoveryCode) {
        const recoveryCode = await prisma.mfaRecoveryCode.findFirst({
          where: {
            userId: challenge.user.id,
            codeHash: recoveryCodeHash(normalizedRecoveryCode, challenge.user.id),
            usedAt: null,
          },
          select: { id: true },
        });
        recoveryCodeId = recoveryCode?.id ?? null;
        validCode = Boolean(recoveryCodeId);
      } else {
        validCode = verifyTotpCode(
          decryptTotpSecret(challenge.user.totpSecret, challenge.user.id),
          code,
        );
      }
    }

    if (!validCode) {
      await prisma.loginOtpChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: LOGIN_OTP_MAX_ATTEMPTS },
        },
        data: { attempts: { increment: 1 } },
      });
      const response = privateJson({ error: INVALID_OTP }, { status: 401 });
      if (challenge.attempts + 1 >= LOGIN_OTP_MAX_ATTEMPTS) {
        clearLoginOtpCookie(response);
      }
      await recordSecurityAuditEvent({
        userId: challenge.user.id,
        action: SECURITY_AUDIT_ACTIONS.LOGIN,
        outcome: "FAILURE",
        actorType: "OWNER",
        metadata: {
          method: challenge.method === "TOTP" ? "password_totp" : "password_otp",
        },
      });
      return response;
    }

    const storedSession = await prisma.$transaction(async (tx) => {
      const consumed = await tx.loginOtpChallenge.updateMany({
        where: {
          id: challenge.id,
          tokenHash,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: LOGIN_OTP_MAX_ATTEMPTS },
        },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return null;

      if (recoveryCodeId) {
        const usedRecoveryCode = await tx.mfaRecoveryCode.updateMany({
          where: { id: recoveryCodeId, userId: challenge.user.id, usedAt: null },
          data: { usedAt: now },
        });
        if (usedRecoveryCode.count !== 1) {
          throw new Error("Recovery code was already consumed.");
        }
      }

      return tx.userSession.create({
        data: {
          userId: challenge.user.id,
          method: challenge.method === "TOTP" ? "password_totp" : "password_otp",
          deviceLabel: requestDeviceLabel(req),
          createdAt: now,
          lastSeenAt: now,
          expiresAt: new Date(now.getTime() + USER_SESSION_TTL_MS),
        },
      });
    });
    if (!storedSession) {
      const response = privateJson({ error: INVALID_OTP }, { status: 401 });
      clearLoginOtpCookie(response);
      return response;
    }

    const sessionToken = await signToken({
      userId: challenge.user.id,
      sessionId: storedSession.id,
      sessionVersion: challenge.user.sessionVersion,
    });
    await clearRateLimits(policies);
    await recordSecurityAuditEvent({
      userId: challenge.user.id,
      action: SECURITY_AUDIT_ACTIONS.LOGIN,
      outcome: "SUCCESS",
      actorType: "OWNER",
      metadata: {
        method: challenge.method === "TOTP" ? "password_totp" : "password_otp",
      },
    });
    if (recoveryCodeId) {
      await recordSecurityAuditEvent({
        userId: challenge.user.id,
        action: SECURITY_AUDIT_ACTIONS.RECOVERY_CODE_USED,
        outcome: "SUCCESS",
        actorType: "OWNER",
      });
    }

    const response = privateJson({
      success: true,
      message: "Login berhasil.",
      userId: challenge.user.id,
      protectedVaultKey: challenge.user.vaultKeyEnvelope,
      vaultCryptoVersion: challenge.user.vaultCryptoVersion,
    });
    setSessionCookie(response, sessionToken);
    clearLoginOtpCookie(response);
    return response;
  } catch {
    return privateJson({ error: "Verifikasi OTP belum dapat diproses." }, { status: 500 });
  }
}
