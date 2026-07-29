import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { privateJson, readBoundedJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await readBoundedJson(req, 1024);
  if (!parsed.ok) return parsed.response;
  const action = parsed.value.action;
  if (action !== "approve" && action !== "reject") {
    return privateJson({ error: "Aksi tidak valid." }, { status: 400 });
  }

  const { id } = await params;
  const contact = await prisma.trustedContact.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!contact) {
    return privateJson({ error: "Tidak ditemukan." }, { status: 404 });
  }

  const updated = await prisma.emergencyAccessRequest.updateMany({
    where: { trustedContactId: id, status: "PENDING" },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      resolvedAt: new Date(),
    },
  });
  if (updated.count !== 1) {
    return privateJson({ error: "Tidak ada permintaan aktif." }, { status: 409 });
  }

  return privateJson({ success: true });
}
