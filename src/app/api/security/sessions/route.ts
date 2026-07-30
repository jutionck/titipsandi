import { NextRequest } from "next/server";

import { clearSessionCookie, getSession } from "@/lib/auth";
import { privateJson, readBoundedJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { recordSecurityAuditEvent, SECURITY_AUDIT_ACTIONS } from "@/lib/security-audit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: session.userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      method: true,
      deviceLabel: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return privateJson({
    currentSessionId: session.sessionId,
    sessions,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await readBoundedJson(req, 1024);
  if (!parsed.ok) return parsed.response;
  const requestedId =
    typeof parsed.value.sessionId === "string" ? parsed.value.sessionId.trim() : "";
  const allOthers = parsed.value.allOthers === true;
  if (!allOthers && (!requestedId || requestedId.length > 100)) {
    return privateJson({ error: "Sesi tidak valid." }, { status: 400 });
  }

  const now = new Date();
  const result = await prisma.userSession.updateMany({
    where: {
      userId: session.userId,
      revokedAt: null,
      ...(allOthers ? { id: { not: session.sessionId } } : { id: requestedId }),
    },
    data: { revokedAt: now },
  });
  if (!allOthers && result.count !== 1) {
    return privateJson({ error: "Sesi tidak ditemukan atau sudah dicabut." }, { status: 404 });
  }

  await recordSecurityAuditEvent({
    userId: session.userId,
    action: SECURITY_AUDIT_ACTIONS.SESSION_REVOKED,
    outcome: "SUCCESS",
    actorType: "OWNER",
    metadata: {
      scope: allOthers ? "other_sessions" : "single_session",
      revokedCount: result.count,
    },
  });

  const response = privateJson({ success: true, revokedCount: result.count });
  if (!allOthers && requestedId === session.sessionId) {
    clearSessionCookie(response);
  }
  return response;
}
