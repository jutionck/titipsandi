import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { privateJson, requireJson, safeText } from "@/lib/api-security";
import { encryptVaultField, publicVaultEntry } from "@/lib/vault-crypto";
import { isCategoryValue } from "@/lib/categories";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: session.userId };
  if (category) where.category = category;

  const entries = await prisma.vaultEntry.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  const publicEntries = entries.map(publicVaultEntry);

  let filteredEntries = publicEntries;
  if (search) {
    const s = search.toLowerCase();
    filteredEntries = publicEntries.filter(
      (e) =>
        e.title.toLowerCase().includes(s) ||
        e.username?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s),
    );
  }

  return privateJson({ entries: filteredEntries });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!requireJson(req)) {
      return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
    }

    const body = await req.json();
    const { category, title, username, email, password, pin, url, notes } = body;
    const cleanCategory = safeText(category, 40);
    const cleanTitle = safeText(title, 200);
    const cleanPassword = typeof password === "string" ? password : "";

    if (!cleanCategory || !cleanTitle || !cleanPassword) {
      return privateJson({ error: "Kategori, judul, dan password wajib diisi" }, { status: 400 });
    }

    if (!isCategoryValue(cleanCategory)) {
      return privateJson({ error: "Kategori tidak valid" }, { status: 400 });
    }

    if (cleanPassword.length > 10_000) {
      return privateJson({ error: "Password melebihi batas 10.000 karakter" }, { status: 400 });
    }

    const entryId = crypto.randomUUID();
    const entry = await prisma.vaultEntry.create({
      data: {
        id: entryId,
        userId: session.userId,
        category: cleanCategory,
        title: encryptVaultField("title", cleanTitle, entryId)!,
        username: encryptVaultField("username", safeText(username, 500), entryId),
        email: encryptVaultField("email", safeText(email, 500), entryId),
        password: encryptVaultField("password", cleanPassword, entryId)!,
        pin: encryptVaultField("pin", safeText(pin, 500), entryId),
        url: encryptVaultField("url", safeText(url, 2_000), entryId),
        notes: encryptVaultField("notes", safeText(notes, 10_000), entryId),
      },
      select: { id: true, createdAt: true },
    });

    return privateJson({ entry }, { status: 201 });
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
