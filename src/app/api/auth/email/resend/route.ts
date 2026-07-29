import { after, NextRequest } from "next/server";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { sendEmailVerificationEmail } from "@/lib/email";
import { createEmailVerificationToken, emailVerificationUrl } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail, emailIndexCandidates, normalizeEmail } from "@/lib/user-crypto";

const MESSAGE = "Jika akun belum aktif, kami akan mengirim tautan verifikasi baru.";

export async function POST(req: NextRequest) {
  const parsed = await readBoundedJson(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;
  const email = typeof parsed.value.email === "string" ? normalizeEmail(parsed.value.email) : "";
  if (!email || Buffer.byteLength(email, "utf8") > 320) {
    return privateJson({ success: true, message: MESSAGE }, { status: 202 });
  }

  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "email-resend-ip",
      identifier: requestClientIp(req),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    },
    {
      scope: "email-resend-account",
      identifier: email,
      limit: 3,
      windowMs: 60 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const indexes = emailIndexCandidates(email);
    const user = await prisma.user.findFirst({
      where: {
        emailVerifiedAt: null,
        OR: [{ emailHash: { in: indexes.legacy } }, { emailHashV2: { in: indexes.derived } }],
      },
      select: { id: true, email: true },
    });
    if (user) {
      const generated = createEmailVerificationToken();
      const created = await prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
        return tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: generated.tokenHash,
            expiresAt: generated.expiresAt,
          },
          select: { id: true },
        });
      });
      const recipient = decryptUserEmail(user.email, user.id);
      after(async () => {
        try {
          await sendEmailVerificationEmail(recipient, emailVerificationUrl(generated.token));
        } catch {
          await prisma.emailVerificationToken.deleteMany({ where: { id: created.id } });
          console.error("Pengiriman ulang email verifikasi gagal.");
        }
      });
    }
  } catch {
    console.error("Pemrosesan kirim ulang verifikasi gagal.");
  }
  return privateJson({ success: true, message: MESSAGE }, { status: 202 });
}
