import crypto from "node:crypto";

export const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashPasswordResetToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(`titipsandi:password-reset:v1:${token}`, "utf8")
    .digest("hex");
}

export function createPasswordResetToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

export function isPasswordResetToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function applicationOrigin() {
  const configured = process.env.APP_ORIGIN;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN wajib diisi di production.");
  }

  const url = new URL(configured || "http://localhost:3000");
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error("APP_ORIGIN harus berupa origin HTTPS tanpa path, query, atau credential.");
  }
  return url.origin;
}

export function passwordResetUrl(token: string, origin = applicationOrigin()) {
  if (!isPasswordResetToken(token)) {
    throw new Error("Token reset password tidak valid.");
  }
  const url = new URL("/recover", origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
