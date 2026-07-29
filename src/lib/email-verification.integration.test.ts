import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { expect, it } from "vitest";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? it : it.skip;

databaseTest("verifies an email token once", async () => {
  process.env.ENCRYPTION_KEY = "b".repeat(64);
  const { POST } = await import("@/app/api/auth/email/verify/route");
  const { createEmailVerificationToken } = await import("@/lib/email-verification");
  const { prisma } = await import("@/lib/prisma");
  const generated = createEmailVerificationToken();
  const id = crypto.randomUUID();

  try {
    await prisma.user.create({
      data: {
        id,
        name: "test",
        email: "test",
        emailHash: crypto.randomUUID(),
        passwordHash: "test",
        emailVerificationTokens: {
          create: { tokenHash: generated.tokenHash, expiresAt: generated.expiresAt },
        },
      },
    });
    const request = () =>
      new NextRequest("https://titipsandi.test/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.26" },
        body: JSON.stringify({ token: generated.token }),
      });

    await expect(POST(request())).resolves.toMatchObject({ status: 200 });
    await expect(POST(request())).resolves.toMatchObject({ status: 400 });
    await expect(prisma.user.findUnique({ where: { id } })).resolves.toMatchObject({
      emailVerifiedAt: expect.any(Date),
    });
  } finally {
    await prisma.user.deleteMany({ where: { id } });
  }
});
