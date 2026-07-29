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

const INVALID_OTP = "Kode OTP tidak valid atau sudah kedaluwarsa.";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 2 * 1024);
    if (!parsed.ok) return parsed.response;

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(LOGIN_OTP_COOKIE)?.value;
    const code = parsed.value.code;
    if (!validLoginOtpToken(challengeToken) || !validLoginOtpCode(code)) {
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
          select: { id: true, sessionVersion: true, emailVerifiedAt: true },
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

    if (!loginOtpCodeMatches(challengeToken, code, challenge.codeHash)) {
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
      return response;
    }

    const consumed = await prisma.loginOtpChallenge.updateMany({
      where: {
        id: challenge.id,
        tokenHash,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: LOGIN_OTP_MAX_ATTEMPTS },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      const response = privateJson({ error: INVALID_OTP }, { status: 401 });
      clearLoginOtpCookie(response);
      return response;
    }

    const sessionToken = await signToken({
      userId: challenge.user.id,
      sessionVersion: challenge.user.sessionVersion,
    });
    await clearRateLimits(policies);

    const response = privateJson({ success: true, message: "Login berhasil." });
    setSessionCookie(response, sessionToken);
    clearLoginOtpCookie(response);
    return response;
  } catch {
    return privateJson({ error: "Verifikasi OTP belum dapat diproses." }, { status: 500 });
  }
}
