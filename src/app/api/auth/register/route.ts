import { after, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmailVerificationEmail } from "@/lib/email";
import { createEmailVerificationToken, emailVerificationUrl } from "@/lib/email-verification";
import { privateJson, readBoundedJson, requestClientIp, safeText } from "@/lib/api-security";
import { enforceRateLimits } from "@/lib/rate-limit";
import {
  emailIndexCandidates,
  encryptUserEmail,
  encryptUserName,
  legacyEmailIndex,
  normalizeEmail,
} from "@/lib/user-crypto";
import { CLIENT_VAULT_CRYPTO_VERSION, validateProtectedVaultKey } from "@/lib/client-vault-crypto";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { name, email, authenticationSecret, userId, protectedVaultKey, recoveryVaultKey } =
      parsed.value;
    const cleanName = safeText(name, 100);
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

    if (
      !cleanName ||
      !normalizedEmail ||
      typeof authenticationSecret !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/u.test(authenticationSecret) ||
      typeof userId !== "string" ||
      !UUID_V4.test(userId)
    ) {
      return privateJson({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    let vaultKeyEnvelope;
    let recoveryVaultKeyEnvelope;
    try {
      vaultKeyEnvelope = validateProtectedVaultKey(protectedVaultKey, "password");
      recoveryVaultKeyEnvelope = validateProtectedVaultKey(recoveryVaultKey, "recovery");
    } catch {
      return privateJson({ error: "Kunci vault tidak valid" }, { status: 400 });
    }

    if (Buffer.byteLength(normalizedEmail, "utf8") > 320) {
      return privateJson({ error: "Email tidak valid" }, { status: 400 });
    }

    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "register-ip",
        identifier: requestClientIp(req),
        limit: 5,
        windowMs: 60 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const indexes = emailIndexCandidates(normalizedEmail);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ emailHash: { in: indexes.legacy } }, { emailHashV2: { in: indexes.derived } }],
      },
    });
    if (existing) {
      return privateJson({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(authenticationSecret, 12);
    const generated = createEmailVerificationToken();
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: encryptUserName(cleanName, userId),
        email: encryptUserEmail(normalizedEmail, userId),
        emailHash: legacyEmailIndex(normalizedEmail),
        emailHashV2: indexes.current,
        passwordHash,
        vaultKeyEnvelope,
        vaultCryptoVersion: CLIENT_VAULT_CRYPTO_VERSION,
        recoveryVaultKeyEnvelope,
        recoveryKeyVersion: CLIENT_VAULT_CRYPTO_VERSION,
        emailVerificationTokens: {
          create: {
            tokenHash: generated.tokenHash,
            expiresAt: generated.expiresAt,
          },
        },
      },
      select: { id: true, email: true, emailVerificationTokens: { select: { id: true } } },
    });

    const verificationTokenId = user.emailVerificationTokens[0]?.id;
    after(async () => {
      try {
        await sendEmailVerificationEmail(normalizedEmail, emailVerificationUrl(generated.token));
      } catch {
        if (verificationTokenId) {
          await prisma.emailVerificationToken.deleteMany({
            where: { id: verificationTokenId },
          });
        }
        console.error("Pengiriman email verifikasi gagal.");
      }
    });

    return privateJson(
      {
        success: true,
        requiresEmailVerification: true,
        message: "Akun dibuat. Periksa email untuk mengaktifkan akun sebelum login.",
      },
      { status: 201 },
    );
  } catch {
    return privateJson({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
