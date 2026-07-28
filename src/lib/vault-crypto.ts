import type { VaultEntry } from "@/generated/prisma/client";
import { decrypt, encrypt } from "@/lib/encryption";

type SensitiveField =
  | "title"
  | "username"
  | "email"
  | "password"
  | "pin"
  | "url"
  | "notes";

function context(field: SensitiveField) {
  return `vault.${field}`;
}

export function encryptVaultField(
  field: SensitiveField,
  value: string | null,
  entryId: string
) {
  return value ? encrypt(value, `${context(field)}:${entryId}`) : null;
}

export function publicVaultEntry(entry: VaultEntry) {
  return {
    id: entry.id,
    category: entry.category,
    title: decrypt(entry.title, `${context("title")}:${entry.id}`),
    username: entry.username
      ? decrypt(entry.username, `${context("username")}:${entry.id}`)
      : null,
    email: entry.email
      ? decrypt(entry.email, `${context("email")}:${entry.id}`)
      : null,
    password: decrypt(
      entry.password,
      `${context("password")}:${entry.id}`
    ),
    pin: entry.pin ? decrypt(entry.pin, `${context("pin")}:${entry.id}`) : null,
    url: entry.url ? decrypt(entry.url, `${context("url")}:${entry.id}`) : null,
    notes: entry.notes
      ? decrypt(entry.notes, `${context("notes")}:${entry.id}`)
      : null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
