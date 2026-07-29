import { after, NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson, safeText } from "@/lib/api-security";
import { sendTrustedContactInvitationEmail } from "@/lib/email";
import { applicationOrigin } from "@/lib/password-recovery";
import { enforceRateLimits } from "@/lib/rate-limit";
import {
  emergencyCodeHash,
  encryptContactData,
  generateEmergencyCode,
  publicContact,
} from "@/lib/trusted-contact-crypto";
import { decryptUserName } from "@/lib/user-crypto";

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
    if (
      Buffer.byteLength(cleanEmail, "utf8") > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return privateJson({ error: "Format email tidak valid" }, { status: 400 });
    }

    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "trusted-invitation-owner",
        identifier: session.userId,
        limit: 20,
        windowMs: 24 * 60 * 60 * 1000,
      },
      {
        scope: "trusted-invitation-recipient",
        identifier: cleanEmail,
        limit: 3,
        windowMs: 24 * 60 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const owner = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    if (!owner) {
      return privateJson({ error: "Unauthorized" }, { status: 401 });
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

    try {
      const ownerName = decryptUserName(owner.name, session.userId);
      const emergencyUrl = new URL("/emergency", applicationOrigin()).toString();
      after(async () => {
        try {
          await sendTrustedContactInvitationEmail(cleanEmail, {
            contactName: cleanName,
            ownerName,
            relation: cleanRelation,
            emergencyUrl,
          });
        } catch {
          console.error("Pengiriman email undangan kontak darurat gagal.");
        }
      });
    } catch {
      console.error("Penjadwalan email undangan kontak darurat gagal.");
    }

    return privateJson(
      {
        contact: publicContact(contact),
        emergencyCode,
        invitationRecipient: cleanEmail,
      },
      { status: 201 },
    );
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
