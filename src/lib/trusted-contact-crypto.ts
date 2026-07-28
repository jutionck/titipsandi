import crypto from "crypto";
import type { TrustedContact } from "@/generated/prisma/client";
import { decrypt, encrypt } from "@/lib/encryption";

export function generateEmergencyCode() {
  return crypto
    .randomBytes(16)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,8}/g)!
    .join("-");
}

export function normalizeEmergencyCode(code: string) {
  return code.replace(/[^a-f0-9]/gi, "").toUpperCase();
}

export function emergencyCodeHash(code: string) {
  return crypto
    .createHash("sha256")
    .update(normalizeEmergencyCode(code))
    .digest("hex");
}

export function encryptContactData(data: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  relation: string;
}) {
  return {
    name: encrypt(data.name.trim(), `contact.name:${data.id}`),
    email: encrypt(
      data.email.trim().toLowerCase(),
      `contact.email:${data.id}`
    ),
    phone: data.phone
      ? encrypt(data.phone.trim(), `contact.phone:${data.id}`)
      : null,
    relation: encrypt(data.relation.trim(), `contact.relation:${data.id}`),
  };
}

export function publicContact(contact: TrustedContact) {
  return {
    id: contact.id,
    name: decrypt(contact.name, `contact.name:${contact.id}`),
    email: decrypt(contact.email, `contact.email:${contact.id}`),
    phone: contact.phone
      ? decrypt(contact.phone, `contact.phone:${contact.id}`)
      : null,
    relation: decrypt(contact.relation, `contact.relation:${contact.id}`),
    isActivated: contact.isActivated,
    activatedAt: contact.activatedAt,
    createdAt: contact.createdAt,
  };
}
