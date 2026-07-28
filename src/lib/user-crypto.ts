import { blindIndex, decrypt, encrypt } from "@/lib/encryption";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailIndex(email: string) {
  return blindIndex(normalizeEmail(email), "user.email");
}

export function encryptUserName(name: string, userId: string) {
  return encrypt(name.trim(), `user.name:${userId}`);
}

export function encryptUserEmail(email: string, userId: string) {
  return encrypt(normalizeEmail(email), `user.email:${userId}`);
}

export function decryptUserName(name: string, userId: string) {
  return decrypt(name, `user.name:${userId}`);
}

export function decryptUserEmail(email: string, userId: string) {
  return decrypt(email, `user.email:${userId}`);
}
