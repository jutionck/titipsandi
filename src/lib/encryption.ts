import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const FORMAT_VERSION = "v1";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) {
    throw new Error(
      "ENCRYPTION_KEY wajib berupa 32-byte hex (64 karakter)."
    );
  }
  return Buffer.from(key, "hex");
}

export function blindIndex(value: string, context: string): string {
  return crypto
    .createHmac("sha256", getKey())
    .update(`${context}\0${value}`)
    .digest("hex");
}

export function encrypt(text: string, context: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(Buffer.from(`brankas:${context}`, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decrypt(encryptedText: string, context: string): string {
  const parts = encryptedText.split(".");
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error("Format ciphertext tidak valid.");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const encrypted = Buffer.from(parts[3], "base64url");
  if (iv.length !== IV_LENGTH || tag.length !== 16) {
    throw new Error("Ciphertext rusak atau tidak valid.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAAD(Buffer.from(`brankas:${context}`, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}
