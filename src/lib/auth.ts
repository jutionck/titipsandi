import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "titipsandi_session";
const TOKEN_ISSUER = "titipsandi.com";
const TOKEN_AUDIENCE = "titipsandi-web";

function getJwtSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(
      "JWT_SECRET wajib berupa 32-byte hex (64 karakter)."
    );
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
