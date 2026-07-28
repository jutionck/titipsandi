import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, signToken } from "@/lib/auth";
import { PRIVATE_RESPONSE_HEADERS, privateJson, requireJson, safeText } from "@/lib/api-security";
import {
  emailIndex,
  encryptUserEmail,
  encryptUserName,
  normalizeEmail,
} from "@/lib/user-crypto";

export async function POST(req: NextRequest) {
  try {
    if (!requireJson(req)) {
      return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
    }

    const { name, email, password } = await req.json();
    const cleanName = safeText(name, 100);
    const normalizedEmail =
      typeof email === "string" ? normalizeEmail(email) : "";

    if (!cleanName || !normalizedEmail || typeof password !== "string") {
      return privateJson(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return privateJson(
        { error: "Password harus 12–72 byte" },
        { status: 400 }
      );
    }

    const hash = emailIndex(normalizedEmail);
    const existing = await prisma.user.findUnique({
      where: { emailHash: hash },
    });
    if (existing) {
      return privateJson(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: encryptUserName(cleanName, userId),
        email: encryptUserEmail(normalizedEmail, userId),
        emailHash: hash,
        passwordHash,
      },
    });

    const token = await signToken({ userId: user.id });

    const response = NextResponse.json(
      {
        success: true,
        user: { id: user.id, name: cleanName, email: normalizedEmail },
      },
      { headers: PRIVATE_RESPONSE_HEADERS }
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 12,
      path: "/",
    });

    return response;
  } catch {
    return privateJson(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
