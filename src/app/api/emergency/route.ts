import { NextRequest } from "next/server";

import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { CLIENT_VAULT_CRYPTO_VERSION } from "@/lib/client-vault-crypto";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { publicContact } from "@/lib/trusted-contact-crypto";
import { decryptUserEmail, decryptUserName } from "@/lib/user-crypto";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 2 * 1024);
    if (!parsed.ok) return parsed.response;
    const { accessCodeHash } = parsed.value;

    if (typeof accessCodeHash !== "string" || !/^[a-f0-9]{64}$/u.test(accessCodeHash)) {
      return privateJson({ error: "Kode akses tidak valid" }, { status: 400 });
    }

    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "emergency-ip",
        identifier: requestClientIp(req),
        limit: 20,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "emergency-code",
        identifier: accessCodeHash,
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const contact = await prisma.trustedContact.findUnique({
      where: { accessCodeHash },
      include: {
        accessRequests: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!contact?.emergencyVaultKeyEnvelope) {
      return privateJson({ error: "Kode akses tidak valid" }, { status: 401 });
    }

    const now = new Date();
    let request = contact.accessRequests[0];
    if (!request) {
      const availableAt = new Date(now.getTime() + contact.accessWaitDays * 24 * 60 * 60 * 1000);
      request = await prisma.emergencyAccessRequest.create({
        data: {
          trustedContactId: contact.id,
          availableAt,
        },
      });
      await prisma.trustedContact.update({
        where: { id: contact.id },
        data: { isActivated: true, activatedAt: contact.activatedAt ?? now },
      });
    }

    if (request.status === "REJECTED") {
      return privateJson(
        { state: "rejected", error: "Permintaan akses ditolak oleh pemilik vault." },
        { status: 403 },
      );
    }

    const granted = request.status === "APPROVED" || request.availableAt <= now;
    if (!granted) {
      return privateJson({
        state: "pending",
        availableAt: request.availableAt,
        message: "Permintaan tercatat dan sedang menunggu persetujuan atau masa tunggu.",
      });
    }

    if (request.status === "PENDING") {
      await prisma.emergencyAccessRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", resolvedAt: now },
      });
    }

    const entries = await prisma.vaultEntry.findMany({
      where: {
        userId: contact.userId,
        clientEncryptionVersion: CLIENT_VAULT_CRYPTO_VERSION,
      },
      select: {
        id: true,
        clientEncryptedPayload: true,
        clientEncryptionVersion: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    const safeContact = publicContact(contact);

    return privateJson({
      state: "granted",
      owner: {
        id: contact.userId,
        name: decryptUserName(contact.user.name, contact.userId),
        email: decryptUserEmail(contact.user.email, contact.userId),
      },
      contact: {
        id: contact.id,
        name: safeContact.name,
        relation: safeContact.relation,
      },
      emergencyVaultKey: contact.emergencyVaultKeyEnvelope,
      entries: entries.map((entry) => ({
        id: entry.id,
        encryptedPayload: entry.clientEncryptedPayload,
        encryptionVersion: entry.clientEncryptionVersion,
      })),
    });
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
