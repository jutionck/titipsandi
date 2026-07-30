import crypto from "node:crypto";
import { expect, it } from "vitest";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? it : it.skip;

databaseTest("records an owner-visible security event without secret material", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { recordSecurityAuditEvent, SECURITY_AUDIT_ACTIONS } = await import("@/lib/security-audit");

  const userId = crypto.randomUUID();

  try {
    await prisma.user.create({
      data: {
        id: userId,
        name: "audit-integration-test",
        email: "audit-integration-test",
        emailHash: crypto.randomUUID(),
        passwordHash: "audit-integration-test",
      },
    });

    await recordSecurityAuditEvent({
      userId,
      action: SECURITY_AUDIT_ACTIONS.LOGIN,
      outcome: "SUCCESS",
      actorType: "OWNER",
      metadata: { method: "password_otp" },
    });

    const event = await prisma.securityAuditEvent.findFirstOrThrow({
      where: { userId },
    });
    expect(event).toMatchObject({
      userId,
      action: "LOGIN",
      outcome: "SUCCESS",
      actorType: "OWNER",
      metadata: { method: "password_otp" },
    });
    expect(event.metadata).not.toHaveProperty("email");
    expect(event.metadata).not.toHaveProperty("code");
    expect(event.metadata).not.toHaveProperty("accessCode");
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
});
