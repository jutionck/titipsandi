import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson } from "@/lib/api-security";
import {
  CLIENT_VAULT_CRYPTO_VERSION,
  validateClientEncryptedVaultPayload,
} from "@/lib/client-vault-crypto";
import { prisma } from "@/lib/prisma";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.vaultEntry.findMany({
    where: {
      userId: session.userId,
      clientEncryptionVersion: CLIENT_VAULT_CRYPTO_VERSION,
    },
    select: {
      id: true,
      clientEncryptedPayload: true,
      clientEncryptionVersion: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return privateJson({
    entries: entries.map((entry) => ({
      id: entry.id,
      encryptedPayload: entry.clientEncryptedPayload,
      encryptionVersion: entry.clientEncryptionVersion,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await readBoundedJson(req, 128 * 1024);
  if (!parsed.ok) return parsed.response;

  const { id, encryptedPayload } = parsed.value;
  if (typeof id !== "string" || !UUID.test(id)) {
    return privateJson({ error: "ID entry tidak valid." }, { status: 400 });
  }

  let envelope;
  try {
    envelope = validateClientEncryptedVaultPayload(encryptedPayload);
  } catch {
    return privateJson({ error: "Ciphertext entry tidak valid." }, { status: 400 });
  }

  try {
    const entry = await prisma.vaultEntry.create({
      data: {
        id,
        userId: session.userId,
        clientEncryptedPayload: envelope,
        clientEncryptionVersion: CLIENT_VAULT_CRYPTO_VERSION,
      },
      select: { id: true, createdAt: true },
    });

    return privateJson({ entry }, { status: 201 });
  } catch {
    return privateJson({ error: "Entry belum dapat disimpan." }, { status: 409 });
  }
}
