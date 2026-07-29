import crypto from "node:crypto";
import { expect, it } from "vitest";

const databaseTest = process.env.RUN_DATABASE_TESTS === "1" ? it : it.skip;

databaseTest("enforces a limit atomically in PostgreSQL", async () => {
  process.env.ENCRYPTION_KEY = "b".repeat(64);
  const { clearRateLimits, consumeRateLimit } = await import("@/lib/rate-limit");
  const policy = {
    scope: "integration-test",
    identifier: crypto.randomUUID(),
    limit: 1,
    windowMs: 60_000,
  };

  try {
    await expect(consumeRateLimit(policy)).resolves.toMatchObject({ allowed: true });
    await expect(consumeRateLimit(policy)).resolves.toMatchObject({ allowed: false });
  } finally {
    await clearRateLimits([policy]);
  }
});
