import { after, NextRequest } from "next/server";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { sendPasswordRecoveryEmail } from "@/lib/email";
import { createPasswordResetToken, passwordResetUrl } from "@/lib/password-recovery";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail, emailIndexCandidates, normalizeEmail } from "@/lib/user-crypto";

const ACCEPTED_MESSAGE = "Jika akun tersebut tersedia, kami akan mengirim tautan pemulihan.";

export async function POST(req: NextRequest) {
  const parsed = await readBoundedJson(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;

  const normalizedEmail =
    typeof parsed.value.email === "string" ? normalizeEmail(parsed.value.email) : "";
  if (!normalizedEmail || Buffer.byteLength(normalizedEmail, "utf8") > 320) {
    return privateJson({ success: true, message: ACCEPTED_MESSAGE }, { status: 202 });
  }

  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "recovery-request-ip",
      identifier: requestClientIp(req),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    },
    {
      scope: "recovery-request-account",
      identifier: normalizedEmail,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const indexes = emailIndexCandidates(normalizedEmail);
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ emailHash: { in: indexes.legacy } }, { emailHashV2: { in: indexes.derived } }],
      },
      select: { id: true, email: true },
    });

    if (user) {
      const generated = createPasswordResetToken();
      const resetToken = await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
        return tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: generated.tokenHash,
            expiresAt: generated.expiresAt,
          },
          select: { id: true },
        });
      });

      const recipient = decryptUserEmail(user.email, user.id);
      const recoveryUrl = passwordResetUrl(generated.token);
      after(async () => {
        try {
          await sendPasswordRecoveryEmail(recipient, recoveryUrl);
        } catch {
          await prisma.passwordResetToken.deleteMany({ where: { id: resetToken.id } });
          console.error("Pengiriman email pemulihan akun gagal.");
        }
      });
    }
  } catch {
    console.error("Pemrosesan permintaan pemulihan akun gagal.");
  }

  return privateJson({ success: true, message: ACCEPTED_MESSAGE }, { status: 202 });
}
