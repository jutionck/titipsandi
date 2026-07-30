import crypto from "node:crypto";

import { blindIndex, decrypt, encrypt } from "@/lib/encryption";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_PATTERN = /^\d{6}$/u;
const RECOVERY_CODE_PATTERN = /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){2}$/u;

function toBase32(value: Buffer) {
  let bits = "";
  let output = "";
  for (const byte of value) bits += byte.toString(2).padStart(8, "0");
  for (let offset = 0; offset < bits.length; offset += 5) {
    const chunk = bits.slice(offset, offset + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function fromBase32(value: string) {
  const normalized = value.replace(/=+$/u, "").toUpperCase();
  let bits = "";
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Secret TOTP tidak valid.");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function counterBuffer(counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

export function generateTotpSecret() {
  return toBase32(crypto.randomBytes(20));
}

export function totpCode(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);
  const digest = crypto
    .createHmac("sha1", fromBase32(secret))
    .update(counterBuffer(counter))
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

export function verifyTotpCode(secret: string, code: unknown, timestamp = Date.now()) {
  if (typeof code !== "string" || !TOTP_PATTERN.test(code)) return false;
  return [-1, 0, 1].some((window) => {
    const expected = totpCode(secret, timestamp + window * TOTP_STEP_SECONDS * 1000);
    return crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected));
  });
}

export function totpProvisioningUri(secret: string, email: string) {
  const issuer = "TitipSandi";
  const label = `${issuer}:${email}`;
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: TOTP_DIGITS.toString(),
    period: TOTP_STEP_SECONDS.toString(),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}

export function encryptTotpSecret(secret: string, userId: string) {
  return encrypt(secret, `user.totp-secret:${userId}`);
}

export function decryptTotpSecret(secret: string, userId: string) {
  return decrypt(secret, `user.totp-secret:${userId}`);
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const compact = toBase32(crypto.randomBytes(8)).slice(0, 12);
    return compact.match(/.{4}/gu)!.join("-");
  });
}

export function normalizeRecoveryCode(value: unknown) {
  if (typeof value !== "string") return "";
  const compact = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-9]/gu, "");
  if (compact.length !== 12) return "";
  const normalized = compact.match(/.{4}/gu)!.join("-");
  return RECOVERY_CODE_PATTERN.test(normalized) ? normalized : "";
}

export function recoveryCodeHash(code: string, userId: string) {
  return blindIndex(normalizeRecoveryCode(code), `mfa-recovery-code:${userId}`);
}
