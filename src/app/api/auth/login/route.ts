import { after, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setLoginOtpCookie } from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { sendLoginOtpEmail } from "@/lib/email";
import { createLoginOtpChallenge, maskEmail } from "@/lib/login-otp";
import { clearRateLimits, enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail, emailIndexCandidates, normalizeEmail } from "@/lib/user-crypto";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { email, authenticationSecret } = parsed.value;

    if (
      typeof email !== "string" ||
      typeof authenticationSecret !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/u.test(authenticationSecret)
    ) {
      return privateJson({ error: "Email dan password wajib diisi" }, { status: 400 });
    }
    if (Buffer.byteLength(email, "utf8") > 320) {
      return privateJson({ error: "Email atau password salah" }, { status: 401 });
    }

    const normalizedEmail = normalizeEmail(email);
    const indexes = emailIndexCandidates(normalizedEmail);
    const rateLimitPolicies = [
      {
        scope: "login-ip",
        identifier: requestClientIp(req),
        limit: 30,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "login-account",
        identifier: normalizedEmail,
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
    ];
    const rateLimitResponse = await enforceRateLimits(rateLimitPolicies);
    if (rateLimitResponse) return rateLimitResponse;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ emailHash: { in: indexes.legacy } }, { emailHashV2: { in: indexes.derived } }],
      },
    });
    if (!user) {
      return privateJson({ error: "Email atau password salah" }, { status: 401 });
    }

    const valid = await bcrypt.compare(authenticationSecret, user.passwordHash);
    if (!valid) {
      return privateJson({ error: "Email atau password salah" }, { status: 401 });
    }
    if (!user.emailVerifiedAt) {
      return privateJson(
        { error: "Email belum diverifikasi. Periksa inbox atau kirim ulang tautan." },
        { status: 403 },
      );
    }

    if (user.emailHashV2 !== indexes.current) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailHashV2: indexes.current },
      });
    }

    const otpRateLimitResponse = await enforceRateLimits([
      {
        scope: "login-otp-issue-ip",
        identifier: requestClientIp(req),
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "login-otp-issue-user",
        identifier: user.id,
        limit: 5,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    if (otpRateLimitResponse) return otpRateLimitResponse;

    const generated = createLoginOtpChallenge();
    const challenge = await prisma.$transaction(async (tx) => {
      await tx.loginOtpChallenge.deleteMany({ where: { userId: user.id } });
      return tx.loginOtpChallenge.create({
        data: {
          userId: user.id,
          tokenHash: generated.tokenHash,
          codeHash: generated.codeHash,
          expiresAt: generated.expiresAt,
        },
        select: { id: true },
      });
    });

    const recipient = decryptUserEmail(user.email, user.id);
    await clearRateLimits(rateLimitPolicies);

    after(async () => {
      try {
        await sendLoginOtpEmail(recipient, generated.code);
      } catch {
        await prisma.loginOtpChallenge.deleteMany({ where: { id: challenge.id } });
        console.error("Pengiriman OTP login gagal.");
      }
    });

    const response = privateJson(
      {
        success: true,
        requiresOtp: true,
        maskedEmail: maskEmail(recipient),
        message: "Kode OTP telah dikirim ke email Anda.",
      },
      { status: 202 },
    );
    setLoginOtpCookie(response, generated.token);

    return response;
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
