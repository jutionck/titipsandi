import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { privateJson, requireJson } from "@/lib/api-security";
import {
  decryptUserEmail,
  decryptUserName,
} from "@/lib/user-crypto";
import {
  emergencyCodeHash,
  normalizeEmergencyCode,
  publicContact,
} from "@/lib/trusted-contact-crypto";
import { publicVaultEntry } from "@/lib/vault-crypto";

export async function POST(req: NextRequest) {
  try {
    if (!requireJson(req)) {
      return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
    }

    const { accessCode } = await req.json();
    const normalized =
      typeof accessCode === "string"
        ? normalizeEmergencyCode(accessCode)
        : "";

    if (!/^[A-F0-9]{32}$/.test(normalized)) {
      return privateJson(
        { error: "Kode akses tidak valid" },
        { status: 400 }
      );
    }

    const contact = await prisma.trustedContact.findUnique({
      where: { accessCodeHash: emergencyCodeHash(normalized) },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!contact) {
      return privateJson(
        { error: "Kode akses tidak valid" },
        { status: 401 }
      );
    }

    if (!contact.isActivated) {
      await prisma.trustedContact.update({
        where: { id: contact.id },
        data: { isActivated: true, activatedAt: new Date() },
      });
    }

    const entries = await prisma.vaultEntry.findMany({
      where: { userId: contact.userId },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    const safeContact = publicContact(contact);

    return privateJson({
      owner: {
        name: decryptUserName(contact.user.name, contact.userId),
        email: decryptUserEmail(contact.user.email, contact.userId),
      },
      contact: {
        name: safeContact.name,
        relation: safeContact.relation,
      },
      entries: entries.map(publicVaultEntry),
    });
  } catch {
    return privateJson(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
