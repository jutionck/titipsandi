import { getSession } from "@/lib/auth";
import { privateJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.securityAuditEvent.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      action: true,
      outcome: true,
      actorType: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return privateJson({ events });
}
