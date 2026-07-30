import { getSession } from "@/lib/auth";
import { privateJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { encryptTotpSecret, generateTotpSecret, totpProvisioningUri } from "@/lib/totp";
import { decryptUserEmail } from "@/lib/user-crypto";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, totpEnabledAt: true },
  });
  if (!user) return privateJson({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (user.totpEnabledAt) {
    return privateJson({ error: "Authenticator sudah aktif." }, { status: 409 });
  }
  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "totp-setup-user",
      identifier: session.userId,
      limit: 10,
      windowMs: 24 * 60 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: session.userId },
    data: { totpSecret: encryptTotpSecret(secret, session.userId), totpEnabledAt: null },
  });

  const email = decryptUserEmail(user.email, session.userId);
  return privateJson({
    secret,
    provisioningUri: totpProvisioningUri(secret, email),
  });
}
