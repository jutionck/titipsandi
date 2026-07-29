import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { privateJson } from "@/lib/api-security";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.trustedContact.findFirst({
    where: { id, userId: session.userId },
  });

  if (!existing) {
    return privateJson({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.trustedContact.delete({ where: { id } });
  return privateJson({ success: true });
}
