import { NextRequest } from "next/server";

import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { hashPasswordResetToken, isPasswordResetToken } from "@/lib/password-recovery";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail } from "@/lib/user-crypto";

const INVALID_LINK = "Tautan pemulihan tidak valid atau sudah kedaluwarsa.";

export async function POST(req: NextRequest) {
  const parsed = await readBoundedJson(req, 2 * 1024);
  if (!parsed.ok) return parsed.response;

  const { token } = parsed.value;
  if (!isPasswordResetToken(token)) {
    return privateJson({ error: INVALID_LINK }, { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(token);
  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "recovery-key-ip",
      identifier: requestClientIp(req),
      limit: 20,
      windowMs: 15 * 60 * 1000,
    },
    {
      scope: "recovery-key-token",
      identifier: tokenHash,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const candidate = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      usedAt: true,
      userId: true,
      user: {
        select: {
          recoveryVaultKeyEnvelope: true,
          recoveryKeyVersion: true,
          email: true,
        },
      },
    },
  });
  if (
    !candidate ||
    candidate.usedAt ||
    candidate.expiresAt <= new Date() ||
    !candidate.user.recoveryVaultKeyEnvelope
  ) {
    return privateJson({ error: INVALID_LINK }, { status: 400 });
  }

  return privateJson({
    userId: candidate.userId,
    email: decryptUserEmail(candidate.user.email, candidate.userId),
    recoveryVaultKey: candidate.user.recoveryVaultKeyEnvelope,
    recoveryKeyVersion: candidate.user.recoveryKeyVersion,
  });
}
