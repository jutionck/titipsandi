import crypto from "node:crypto";
import { expect, it, vi } from "vitest";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? it : it.skip;

databaseTest("preserves email lookup and ciphertext access across key rotation", async () => {
  const oldKey = "c".repeat(64);
  const newKey = "d".repeat(64);
  vi.stubEnv("ENCRYPTION_KEY", oldKey);
  vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", "");
  vi.stubEnv("ENCRYPTION_WRITE_VERSION", "v1");

  const { prisma } = await import("@/lib/prisma");
  const {
    decryptUserEmail,
    emailIndexCandidates,
    encryptUserEmail,
    encryptUserName,
    legacyEmailIndex,
  } = await import("@/lib/user-crypto");
  const id = crypto.randomUUID();
  const email = `rotation-${id}@example.test`;
  const initialIndexes = emailIndexCandidates(email);

  try {
    await prisma.user.create({
      data: {
        id,
        name: encryptUserName("Rotation Test", id),
        email: encryptUserEmail(email, id),
        emailHash: legacyEmailIndex(email),
        emailHashV2: initialIndexes.current,
        passwordHash: "integration-test-only",
      },
    });

    vi.stubEnv("ENCRYPTION_KEY", newKey);
    vi.stubEnv("ENCRYPTION_KEY_PREVIOUS", oldKey);
    const rotatedIndexes = emailIndexCandidates(email);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { emailHash: { in: rotatedIndexes.legacy } },
          { emailHashV2: { in: rotatedIndexes.derived } },
        ],
      },
    });

    expect(user?.id).toBe(id);
    expect(decryptUserEmail(user!.email, id)).toBe(email);

    await prisma.user.update({
      where: { id },
      data: { emailHashV2: rotatedIndexes.current },
    });
    await expect(
      prisma.user.findUnique({ where: { emailHashV2: rotatedIndexes.current } }),
    ).resolves.toMatchObject({ id });
  } finally {
    await prisma.user.deleteMany({ where: { id } });
    vi.unstubAllEnvs();
  }
});
