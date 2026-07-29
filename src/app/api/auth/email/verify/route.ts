import { NextRequest } from "next/server";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { hashEmailVerificationToken, isEmailVerificationToken } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";

const INVALID_TOKEN = "Tautan verifikasi tidak valid atau sudah kedaluwarsa.";

export async function POST(req: NextRequest) {
  const parsed = await readBoundedJson(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;
  const token = parsed.value.token;
  if (!isEmailVerificationToken(token)) {
    return privateJson({ error: INVALID_TOKEN }, { status: 400 });
  }

  const tokenHash = hashEmailVerificationToken(token);
  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "email-verify-ip",
      identifier: requestClientIp(req),
      limit: 15,
      windowMs: 15 * 60 * 1000,
    },
    {
      scope: "email-verify-token",
      identifier: tokenHash,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const candidate = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  const now = new Date();
  if (!candidate || candidate.usedAt || candidate.expiresAt <= now) {
    return privateJson({ error: INVALID_TOKEN }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: candidate.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new Error("Token already consumed");
      await tx.user.update({
        where: { id: candidate.userId },
        data: { emailVerifiedAt: now },
      });
      await tx.emailVerificationToken.updateMany({
        where: { userId: candidate.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
    return privateJson({ success: true, message: "Email berhasil diverifikasi. Silakan login." });
  } catch {
    return privateJson({ error: INVALID_TOKEN }, { status: 400 });
  }
}
