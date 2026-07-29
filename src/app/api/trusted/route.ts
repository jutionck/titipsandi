import { after, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson, safeText } from "@/lib/api-security";
import { sendTrustedContactInvitationEmail } from "@/lib/email";
import { applicationOrigin } from "@/lib/password-recovery";
import { enforceRateLimits } from "@/lib/rate-limit";
import { encryptContactData, publicContact } from "@/lib/trusted-contact-crypto";
import { decryptUserName } from "@/lib/user-crypto";
import { CLIENT_VAULT_CRYPTO_VERSION, validateProtectedVaultKey } from "@/lib/client-vault-crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.trustedContact.findMany({
    where: { userId: session.userId },
    include: { accessRequests: true },
    orderBy: { createdAt: "desc" },
  });

  return privateJson({
    contacts: contacts.map((contact) => ({
      ...publicContact(contact),
      accessRequest: contact.accessRequests[0] ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { id, name, email, phone, relation, accessCodeHash, emergencyVaultKey } = parsed.value;
    const cleanName = safeText(name, 100);
    const cleanEmail = safeText(email, 320).toLowerCase();
    const cleanPhone = safeText(phone, 40);
    const cleanRelation = safeText(relation, 100);

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanRelation ||
      typeof id !== "string" ||
      !UUID.test(id) ||
      typeof accessCodeHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(accessCodeHash)
    ) {
      return privateJson({ error: "Nama, email, dan hubungan wajib diisi" }, { status: 400 });
    }

    let emergencyVaultKeyEnvelope;
    try {
      emergencyVaultKeyEnvelope = validateProtectedVaultKey(emergencyVaultKey, "emergency");
    } catch {
      return privateJson({ error: "Kunci akses darurat tidak valid" }, { status: 400 });
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

    const contact = await prisma.trustedContact.create({
      data: {
        id,
        userId: session.userId,
        ...encryptContactData({
          id,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone || null,
          relation: cleanRelation,
        }),
        accessCodeHash,
        emergencyVaultKeyEnvelope,
        emergencyCryptoVersion: CLIENT_VAULT_CRYPTO_VERSION,
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
        invitationRecipient: cleanEmail,
      },
      { status: 201 },
    );
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
