import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signToken } from "@/lib/auth";
import {
  PRIVATE_RESPONSE_HEADERS,
  privateJson,
  readBoundedJson,
  requestClientIp,
  safeText,
} from "@/lib/api-security";
import { enforceRateLimits } from "@/lib/rate-limit";
import {
  emailIndexCandidates,
  encryptUserEmail,
  encryptUserName,
  legacyEmailIndex,
  normalizeEmail,
} from "@/lib/user-crypto";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { name, email, password } = parsed.value;
    const cleanName = safeText(name, 100);
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

    if (!cleanName || !normalizedEmail || typeof password !== "string") {
      return privateJson({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return privateJson({ error: "Password harus 12–72 byte" }, { status: 400 });
    }
    if (Buffer.byteLength(normalizedEmail, "utf8") > 320) {
      return privateJson({ error: "Email tidak valid" }, { status: 400 });
    }

    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "register-ip",
        identifier: requestClientIp(req),
        limit: 5,
        windowMs: 60 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const indexes = emailIndexCandidates(normalizedEmail);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ emailHash: { in: indexes.legacy } }, { emailHashV2: { in: indexes.derived } }],
      },
    });
    if (existing) {
      return privateJson({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: encryptUserName(cleanName, userId),
        email: encryptUserEmail(normalizedEmail, userId),
        emailHash: legacyEmailIndex(normalizedEmail),
        emailHashV2: indexes.current,
        passwordHash,
      },
    });

    const token = await signToken({ userId: user.id });

    const response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, name: cleanName, email: normalizedEmail },
      },
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
    setSessionCookie(response, token);

    return response;
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
