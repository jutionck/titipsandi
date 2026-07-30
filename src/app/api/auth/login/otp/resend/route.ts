import { cookies } from "next/headers";
import { after, NextRequest } from "next/server";
import { LOGIN_OTP_COOKIE } from "@/lib/auth";
import { privateJson, requestClientIp } from "@/lib/api-security";
import { sendLoginOtpEmail } from "@/lib/email";
import {
  createLoginOtpCode,
  hashLoginOtpToken,
  LOGIN_OTP_MAX_ATTEMPTS,
  maskEmail,
  validLoginOtpToken,
} from "@/lib/login-otp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail } from "@/lib/user-crypto";

const INVALID_CHALLENGE = "Sesi verifikasi tidak valid. Silakan login kembali.";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(LOGIN_OTP_COOKIE)?.value;
    if (!validLoginOtpToken(challengeToken)) {
      return privateJson({ error: INVALID_CHALLENGE }, { status: 401 });
    }

    const tokenHash = hashLoginOtpToken(challengeToken);
    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "login-otp-resend-ip",
        identifier: requestClientIp(req),
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "login-otp-resend-token",
        identifier: tokenHash,
        limit: 3,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const challenge = await prisma.loginOtpChallenge.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
    });
    const now = new Date();
    if (
      !challenge ||
      challenge.method !== "EMAIL" ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.attempts >= LOGIN_OTP_MAX_ATTEMPTS ||
      !challenge.user.emailVerifiedAt
    ) {
      return privateJson({ error: INVALID_CHALLENGE }, { status: 401 });
    }

    const generated = createLoginOtpCode(challengeToken);
    const updated = await prisma.loginOtpChallenge.updateMany({
      where: {
        id: challenge.id,
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: LOGIN_OTP_MAX_ATTEMPTS },
      },
      data: {
        codeHash: generated.codeHash,
        expiresAt: generated.expiresAt,
        attempts: 0,
      },
    });
    if (updated.count !== 1) {
      return privateJson({ error: INVALID_CHALLENGE }, { status: 401 });
    }

    const recipient = decryptUserEmail(challenge.user.email, challenge.user.id);
    after(async () => {
      try {
        await sendLoginOtpEmail(recipient, generated.code);
      } catch {
        await prisma.loginOtpChallenge.deleteMany({ where: { id: challenge.id } });
        console.error("Pengiriman ulang OTP login gagal.");
      }
    });

    return privateJson(
      {
        success: true,
        maskedEmail: maskEmail(recipient),
        message: "Kode OTP baru sedang dikirim.",
      },
      { status: 202 },
    );
  } catch {
    return privateJson({ error: "Kode OTP belum dapat dikirim ulang." }, { status: 500 });
  }
}
