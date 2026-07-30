import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson, safeText } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { decryptUserEmail } from "@/lib/user-crypto";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      passkeys: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          backedUp: true,
        },
      },
    },
  });
  if (!user) {
    return privateJson({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  return privateJson({
    email: decryptUserEmail(user.email, session.userId),
    passkeys: user.passkeys,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
  }
  const parsed = await readBoundedJson(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;
  const id = safeText(parsed.value.id, 1024);
  if (!id) {
    return privateJson({ error: "Passkey tidak valid" }, { status: 400 });
  }

  await prisma.passkey.deleteMany({
    where: { id, userId: session.userId },
  });

  return privateJson({ success: true });
}
