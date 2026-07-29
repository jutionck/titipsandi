import { getSession } from "@/lib/auth";
import { privateJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { vaultKeyEnvelope: true, vaultCryptoVersion: true },
  });
  if (!user?.vaultKeyEnvelope) {
    return privateJson({ error: "Akun tidak memiliki kunci vault sisi klien." }, { status: 409 });
  }

  return privateJson({
    userId: session.userId,
    protectedVaultKey: user.vaultKeyEnvelope,
    vaultCryptoVersion: user.vaultCryptoVersion,
    needsProvisioning: false,
  });
}
