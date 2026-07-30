import bcrypt from "bcryptjs";

const AUTHENTICATION_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export function isAuthenticationSecret(value: unknown): value is string {
  return typeof value === "string" && AUTHENTICATION_SECRET_PATTERN.test(value);
}

export async function verifyAuthenticationSecret(value: unknown, passwordHash: string) {
  return isAuthenticationSecret(value) && bcrypt.compare(value, passwordHash);
}
