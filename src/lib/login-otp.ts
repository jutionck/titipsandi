import crypto from "node:crypto";

export const LOGIN_OTP_TTL_MS = 5 * 60 * 1000;
export const LOGIN_OTP_MAX_ATTEMPTS = 5;
const CHALLENGE_BYTES = 32;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CODE_PATTERN = /^\d{6}$/;

export function createLoginOtpChallenge() {
  const token = createLoginChallengeToken();
  return {
    token,
    tokenHash: hashLoginOtpToken(token),
    ...createLoginOtpCode(token),
  };
}

export function createLoginChallengeToken() {
  return crypto.randomBytes(CHALLENGE_BYTES).toString("base64url");
}

export function createLoginOtpCode(token: string) {
  if (!validLoginOtpToken(token)) {
    throw new Error("Token challenge OTP tidak valid.");
  }
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  return {
    code,
    codeHash: hashLoginOtpCode(token, code),
    expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_MS),
  };
}

export function hashLoginOtpToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(`titipsandi:login-otp-token:v1:${token}`, "utf8")
    .digest("hex");
}

export function hashLoginOtpCode(token: string, code: string) {
  return crypto
    .createHmac("sha256", token)
    .update(`titipsandi:login-otp-code:v1:${code}`, "utf8")
    .digest("hex");
}

export function validLoginOtpToken(value: unknown): value is string {
  return typeof value === "string" && CHALLENGE_PATTERN.test(value);
}

export function validLoginOtpCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}

export function loginOtpCodeMatches(token: string, code: string, expectedHash: string) {
  if (
    !validLoginOtpToken(token) ||
    !validLoginOtpCode(code) ||
    !/^[a-f0-9]{64}$/.test(expectedHash)
  ) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(hashLoginOtpCode(token, code), "hex"),
    Buffer.from(expectedHash, "hex"),
  );
}

export function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"*".repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}
