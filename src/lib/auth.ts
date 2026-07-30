import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { USER_SESSION_TTL_SECONDS } from "@/lib/session-policy";

export const SESSION_COOKIE = "titipsandi_session";
export const PASSKEY_CHALLENGE_COOKIE = "titipsandi_passkey_challenge";
export const LOGIN_OTP_COOKIE = "titipsandi_login_otp";
const TOKEN_ISSUER = "titipsandi.com";
const TOKEN_AUDIENCE = "titipsandi-web";
const PASSKEY_AUDIENCE = "titipsandi-passkey";

function getJwtSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("JWT_SECRET wajib berupa 32-byte hex (64 karakter).");
  }
  return new TextEncoder().encode(value);
}

export async function signToken(payload: {
  userId: string;
  sessionId: string;
  sessionVersion: number;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getJwtSecret());
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: USER_SESSION_TTL_SECONDS,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

export function setLoginOtpCookie(response: NextResponse, token: string) {
  response.cookies.set(LOGIN_OTP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 5 * 60,
    path: "/api/auth/login/otp",
  });
}

export function clearLoginOtpCookie(response: NextResponse) {
  response.cookies.set(LOGIN_OTP_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/api/auth/login/otp",
  });
}

export async function signPasskeyChallenge(payload: {
  userId?: string;
  challenge: string;
  purpose: "register" | "authenticate";
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(PASSKEY_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getJwtSecret());
}

export async function verifyPasskeyChallenge(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: PASSKEY_AUDIENCE,
    });
    if (
      typeof payload.challenge !== "string" ||
      (payload.purpose !== "register" && payload.purpose !== "authenticate")
    ) {
      return null;
    }
    return {
      userId: typeof payload.userId === "string" ? payload.userId : undefined,
      challenge: payload.challenge,
      purpose: payload.purpose,
    };
  } catch {
    return null;
  }
}

export function setPasskeyChallengeCookie(response: NextResponse, token: string) {
  response.cookies.set(PASSKEY_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 5 * 60,
    path: "/api/auth/passkeys",
  });
}

export function clearPasskeyChallengeCookie(response: NextResponse) {
  response.cookies.set(PASSKEY_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/api/auth/passkeys",
  });
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    if (typeof payload.userId !== "string" || typeof payload.sessionId !== "string") return null;
    const sessionVersion =
      typeof payload.sessionVersion === "number" &&
      Number.isSafeInteger(payload.sessionVersion) &&
      payload.sessionVersion >= 0
        ? payload.sessionVersion
        : 0;
    return { userId: payload.userId, sessionId: payload.sessionId, sessionVersion };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;

  const { prisma } = await import("@/lib/prisma");
  const storedSession = await prisma.userSession.findFirst({
    where: {
      id: session.sessionId,
      userId: session.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      lastSeenAt: true,
      user: { select: { sessionVersion: true, emailVerifiedAt: true } },
    },
  });
  if (
    !storedSession?.user.emailVerifiedAt ||
    storedSession.user.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }

  if (storedSession.lastSeenAt.getTime() < Date.now() - 5 * 60 * 1000) {
    await prisma.userSession.updateMany({
      where: { id: session.sessionId, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
  }

  return session;
}
