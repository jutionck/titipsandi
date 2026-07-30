import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requestDeviceLabel } from "@/lib/session-device";
import { USER_SESSION_TTL_MS } from "@/lib/session-policy";

export type UserSessionMethod = "password_otp" | "password_totp" | "passkey";

export async function createUserSession(
  req: NextRequest,
  userId: string,
  method: UserSessionMethod,
) {
  const now = new Date();
  return prisma.userSession.create({
    data: {
      userId,
      method,
      deviceLabel: requestDeviceLabel(req),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + USER_SESSION_TTL_MS),
    },
  });
}
