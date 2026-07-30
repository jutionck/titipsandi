import bcrypt from "bcryptjs";
import { after, NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { sendPasswordChangedEmail } from "@/lib/email";
import {
  applicationOrigin,
  hashPasswordResetToken,
  isPasswordResetToken,
} from "@/lib/password-recovery";
import { prisma } from "@/lib/prisma";
import { clearRateLimits, enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail } from "@/lib/user-crypto";
import { CLIENT_VAULT_CRYPTO_VERSION, validateProtectedVaultKey } from "@/lib/client-vault-crypto";
import { recordSecurityAuditEvent, SECURITY_AUDIT_ACTIONS } from "@/lib/security-audit";

const INVALID_LINK = "Tautan pemulihan tidak valid atau sudah kedaluwarsa.";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;

    const { token, authenticationSecret, protectedVaultKey } = parsed.value;
    if (
      !isPasswordResetToken(token) ||
      typeof authenticationSecret !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/u.test(authenticationSecret)
    ) {
      return privateJson({ error: INVALID_LINK }, { status: 400 });
    }

    let vaultKeyEnvelope;
    try {
      vaultKeyEnvelope = validateProtectedVaultKey(protectedVaultKey, "password");
    } catch {
      return privateJson({ error: INVALID_LINK }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(token);
    const policies = [
      {
        scope: "recovery-reset-ip",
        identifier: requestClientIp(req),
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "recovery-reset-token",
        identifier: tokenHash,
        limit: 5,
        windowMs: 15 * 60 * 1000,
      },
    ];
    const rateLimitResponse = await enforceRateLimits(policies);
    if (rateLimitResponse) return rateLimitResponse;

    const candidate = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { email: true } },
      },
    });
    if (!candidate || candidate.usedAt || candidate.expiresAt <= new Date()) {
      return privateJson({ error: INVALID_LINK }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(authenticationSecret, 12);
    const usedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: candidate.id,
          tokenHash,
          usedAt: null,
          expiresAt: { gt: usedAt },
        },
        data: { usedAt },
      });
      if (consumed.count !== 1) {
        throw new Error("Password reset token was already consumed.");
      }

      await tx.user.update({
        where: { id: candidate.userId },
        data: {
          passwordHash,
          vaultKeyEnvelope,
          vaultCryptoVersion: CLIENT_VAULT_CRYPTO_VERSION,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: candidate.userId, usedAt: null },
        data: { usedAt },
      });
      await tx.userSession.updateMany({
        where: { userId: candidate.userId, revokedAt: null },
        data: { revokedAt: usedAt },
      });
    });

    await clearRateLimits(policies);
    await recordSecurityAuditEvent({
      userId: candidate.userId,
      action: SECURITY_AUDIT_ACTIONS.PASSWORD_CHANGED,
      outcome: "SUCCESS",
      actorType: "OWNER",
      metadata: { sessionsRevoked: true },
    });
    try {
      const recipient = decryptUserEmail(candidate.user.email, candidate.userId);
      const securityUrl = new URL("/forgot-password", applicationOrigin()).toString();
      after(async () => {
        try {
          await sendPasswordChangedEmail(recipient, { changedAt: usedAt, securityUrl });
        } catch {
          console.error("Pengiriman notifikasi perubahan password gagal.");
        }
      });
    } catch {
      console.error("Penjadwalan notifikasi perubahan password gagal.");
    }

    const response = privateJson({
      success: true,
      message: "Password berhasil diperbarui. Silakan masuk kembali.",
    });
    clearSessionCookie(response);
    return response;
  } catch {
    return privateJson({ error: INVALID_LINK }, { status: 400 });
  }
}
