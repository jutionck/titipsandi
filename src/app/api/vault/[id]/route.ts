import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson } from "@/lib/api-security";
import {
  CLIENT_VAULT_CRYPTO_VERSION,
  validateClientEncryptedVaultPayload,
} from "@/lib/client-vault-crypto";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.vaultEntry.findFirst({
    where: {
      id,
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
  });
  if (!entry) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  return privateJson({
    entry: {
      id: entry.id,
      encryptedPayload: entry.clientEncryptedPayload,
      encryptionVersion: entry.clientEncryptionVersion,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    },
  });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = await readBoundedJson(req, 128 * 1024);
  if (!parsed.ok) return parsed.response;

  let envelope;
  try {
    envelope = validateClientEncryptedVaultPayload(parsed.value.encryptedPayload);
  } catch {
    return privateJson({ error: "Ciphertext entry tidak valid." }, { status: 400 });
  }

  const updated = await prisma.vaultEntry.updateMany({
    where: { id, userId: session.userId },
    data: {
      clientEncryptedPayload: envelope,
      clientEncryptionVersion: CLIENT_VAULT_CRYPTO_VERSION,
    },
  });
  if (updated.count !== 1) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  return privateJson({ entry: { id } });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await prisma.vaultEntry.deleteMany({
    where: { id, userId: session.userId },
  });
  if (deleted.count !== 1) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  return privateJson({ success: true });
}
