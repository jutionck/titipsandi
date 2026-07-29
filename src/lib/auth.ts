import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "titipsandi_session";
export const PASSKEY_CHALLENGE_COOKIE = "titipsandi_passkey_challenge";
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

export async function signToken(payload: { userId: string }) {
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
    maxAge: 60 * 60 * 12,
    path: "/",
  });
}

export async function signPasskeyChallenge(payload: {
  userId: string;
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
      typeof payload.userId !== "string" ||
      typeof payload.challenge !== "string" ||
      (payload.purpose !== "register" && payload.purpose !== "authenticate")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
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
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
