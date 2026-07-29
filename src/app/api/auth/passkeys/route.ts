import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { privateJson, requireJson, safeText } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const passkeys = await prisma.passkey.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      backedUp: true,
    },
  });

  return privateJson({ passkeys });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
  }
  if (!requireJson(req)) {
    return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
  }

  const body = await req.json();
  const id = safeText(body.id, 1024);
  if (!id) {
    return privateJson({ error: "Passkey tidak valid" }, { status: 400 });
  }

  await prisma.passkey.deleteMany({
    where: { id, userId: session.userId },
  });

  return privateJson({ success: true });
}
