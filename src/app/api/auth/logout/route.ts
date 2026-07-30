import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (session) {
    await prisma.userSession.updateMany({
      where: { id: session.sessionId, userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const response = NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  clearSessionCookie(response);
  return response;
}
