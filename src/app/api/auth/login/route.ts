import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signToken } from "@/lib/auth";
import { PRIVATE_RESPONSE_HEADERS, privateJson, requireJson } from "@/lib/api-security";
import { decryptUserEmail, decryptUserName, emailIndex, normalizeEmail } from "@/lib/user-crypto";

export async function POST(req: NextRequest) {
  try {
    if (!requireJson(req)) {
      return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
    }

    const { email, password } = await req.json();

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
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
