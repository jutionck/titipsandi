import {
  blindIndex,
  blindIndexCandidates,
  decrypt,
  encrypt,
  legacyBlindIndex,
  legacyBlindIndexCandidates,
} from "@/lib/encryption";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailIndex(email: string) {
  return blindIndex(normalizeEmail(email), "user.email");
}

export function legacyEmailIndex(email: string) {
  return legacyBlindIndex(normalizeEmail(email), "user.email");
}

export function emailIndexCandidates(email: string) {
  const normalized = normalizeEmail(email);
  return {
    current: blindIndex(normalized, "user.email"),
    derived: blindIndexCandidates(normalized, "user.email"),
    legacy: legacyBlindIndexCandidates(normalized, "user.email"),
  };
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
