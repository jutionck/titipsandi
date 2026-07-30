import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { recordSecurityAuditEvent, SECURITY_AUDIT_ACTIONS } from "@/lib/security-audit";
import { clearRateLimits, enforceRateLimits } from "@/lib/rate-limit";
import {
  decryptTotpSecret,
  generateRecoveryCodes,
  recoveryCodeHash,
  verifyTotpCode,
} from "@/lib/totp";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return privateJson({ error: "Unauthorized" }, { status: 401 });

  const parsed = await readBoundedJson(req, 1024);
  if (!parsed.ok) return parsed.response;
  const code = parsed.value.code;
  const policies = [
    {
      scope: "totp-confirm-user",
      identifier: session.userId,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  ];
  const rateLimitResponse = await enforceRateLimits(policies);
  if (rateLimitResponse) return rateLimitResponse;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!user?.totpSecret || user.totpEnabledAt) {
    return privateJson({ error: "Setup authenticator tidak aktif." }, { status: 409 });
  }

  const secret = decryptTotpSecret(user.totpSecret, session.userId);
  if (!verifyTotpCode(secret, code)) {
    return privateJson({ error: "Kode authenticator tidak valid." }, { status: 400 });
  }

  const recoveryCodes = generateRecoveryCodes();
  const enabledAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.mfaRecoveryCode.deleteMany({ where: { userId: session.userId } });
    await tx.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((recoveryCode) => ({
        userId: session.userId,
        codeHash: recoveryCodeHash(recoveryCode, session.userId),
      })),
    });
    await tx.user.update({
      where: { id: session.userId },
      data: { totpEnabledAt: enabledAt },
    });
  });

  await recordSecurityAuditEvent({
    userId: session.userId,
    action: SECURITY_AUDIT_ACTIONS.TOTP_ENABLED,
    outcome: "SUCCESS",
    actorType: "OWNER",
  });
  await clearRateLimits(policies);

  return privateJson({
    success: true,
    recoveryCodes,
    message: "Authenticator berhasil diaktifkan. Simpan recovery code sekarang.",
  });
}
