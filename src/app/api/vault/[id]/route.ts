import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { privateJson, requireJson, safeText } from "@/lib/api-security";
import { encryptVaultField, publicVaultEntry } from "@/lib/vault-crypto";
import { isCategoryValue } from "@/lib/categories";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entry = await prisma.vaultEntry.findFirst({
    where: { id, userId: session.userId },
  });

  if (!entry) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  return privateJson({ entry: publicVaultEntry(entry) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.vaultEntry.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  try {
    if (!requireJson(req)) {
      return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
    }

    const body = await req.json();
    const { category, title, username, email, password, pin, url, notes } = body;
    const cleanCategory = category === undefined ? undefined : safeText(category, 40);
    if (cleanCategory !== undefined && !isCategoryValue(cleanCategory)) {
      return privateJson({ error: "Kategori tidak valid" }, { status: 400 });
    }

    const entry = await prisma.vaultEntry.update({
      where: { id },
      data: {
        category: cleanCategory ?? existing.category,
        title:
          title !== undefined
            ? (encryptVaultField("title", safeText(title, 200), id) ?? existing.title)
            : existing.title,
        username:
          username !== undefined
            ? encryptVaultField("username", safeText(username, 500), id)
            : existing.username,
        email:
          email !== undefined
            ? encryptVaultField("email", safeText(email, 500), id)
            : existing.email,
        password:
          typeof password === "string" && password
            ? encryptVaultField("password", password, id)!
            : existing.password,
        pin: pin !== undefined ? encryptVaultField("pin", safeText(pin, 500), id) : existing.pin,
        url: url !== undefined ? encryptVaultField("url", safeText(url, 2_000), id) : existing.url,
        notes:
          notes !== undefined
            ? encryptVaultField("notes", safeText(notes, 10_000), id)
            : existing.notes,
      },
      select: { id: true, updatedAt: true },
    });

    return privateJson({ entry });
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.vaultEntry.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.vaultEntry.delete({ where: { id } });
  return privateJson({ success: true });
}
