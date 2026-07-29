import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson, safeText } from "@/lib/api-security";
import {
  emergencyCodeHash,
  encryptContactData,
  generateEmergencyCode,
  publicContact,
} from "@/lib/trusted-contact-crypto";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.trustedContact.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return privateJson({ contacts: contacts.map(publicContact) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { name, email, phone, relation } = parsed.value;
    const cleanName = safeText(name, 100);
    const cleanEmail = safeText(email, 320).toLowerCase();
    const cleanPhone = safeText(phone, 40);
    const cleanRelation = safeText(relation, 100);

    if (!cleanName || !cleanEmail || !cleanRelation) {
      return privateJson({ error: "Nama, email, dan hubungan wajib diisi" }, { status: 400 });
    }

    const emergencyCode = generateEmergencyCode();
    const contactId = crypto.randomUUID();

    const contact = await prisma.trustedContact.create({
      data: {
        id: contactId,
        userId: session.userId,
        ...encryptContactData({
          id: contactId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone || null,
          relation: cleanRelation,
        }),
        accessCodeHash: emergencyCodeHash(emergencyCode),
      },
    });

    return privateJson({ contact: publicContact(contact), emergencyCode }, { status: 201 });
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
