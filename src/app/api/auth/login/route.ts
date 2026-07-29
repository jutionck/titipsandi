import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signToken } from "@/lib/auth";
import {
  PRIVATE_RESPONSE_HEADERS,
  privateJson,
  readBoundedJson,
  requestClientIp,
} from "@/lib/api-security";
import { clearRateLimits, enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail, decryptUserName, emailIndex, normalizeEmail } from "@/lib/user-crypto";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { email, password } = parsed.value;

    if (typeof email !== "string" || typeof password !== "string") {
      return privateJson({ error: "Email dan password wajib diisi" }, { status: 400 });
    }
    if (Buffer.byteLength(email, "utf8") > 320 || Buffer.byteLength(password, "utf8") > 72) {
      return privateJson({ error: "Email atau password salah" }, { status: 401 });
    }

    const normalizedEmail = normalizeEmail(email);
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

    const user = await prisma.user.findUnique({
      where: { emailHash: emailIndex(normalizedEmail) },
    });
    if (!user) {
      return privateJson({ error: "Email atau password salah" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return privateJson({ error: "Email atau password salah" }, { status: 401 });
    }

    const token = await signToken({ userId: user.id });
    await clearRateLimits(rateLimitPolicies);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: decryptUserName(user.name, user.id),
          email: decryptUserEmail(user.email, user.id),
        },
      },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
    setSessionCookie(response, token);

    return response;
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
