import crypto from "node:crypto";
import { applicationOrigin } from "@/lib/password-recovery";

export const EMAIL_VERIFICATION_TTL_MS = 30 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashEmailVerificationToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(`titipsandi:email-verification:v1:${token}`, "utf8")
    .digest("hex");
}

export function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export function isEmailVerificationToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function emailVerificationUrl(token: string, origin = applicationOrigin()) {
  if (!isEmailVerificationToken(token)) throw new Error("Token verifikasi email tidak valid.");
  const url = new URL("/verify-email", origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
