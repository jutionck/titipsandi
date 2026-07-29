import crypto from "node:crypto";
import { privateJson } from "@/lib/api-security";
import { blindIndex } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

type RateLimitPolicy = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type RateLimitRow = {
  count: number;
  windowStart: Date;
};

function bucketKey(scope: string, identifier: string) {
  return blindIndex(identifier.trim().toLowerCase(), `rate-limit:${scope}`);
}

export async function consumeRateLimit(policy: RateLimitPolicy) {
  const key = bucketKey(policy.scope, policy.identifier);
  const [bucket] = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
    VALUES (
      ${key},
      1,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP + (${policy.windowMs} * INTERVAL '1 millisecond')
    )
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= CURRENT_TIMESTAMP - (${policy.windowMs} * INTERVAL '1 millisecond')
          THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= CURRENT_TIMESTAMP - (${policy.windowMs} * INTERVAL '1 millisecond')
          THEN CURRENT_TIMESTAMP
        ELSE "RateLimitBucket"."windowStart"
      END,
      "expiresAt" = CURRENT_TIMESTAMP + (${policy.windowMs} * INTERVAL '1 millisecond')
    RETURNING "count", "windowStart"
  `;

  if (crypto.randomInt(100) === 0) {
    await prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.windowStart.getTime() + policy.windowMs - Date.now()) / 1000),
  );

  return {
    allowed: bucket.count <= policy.limit,
    retryAfterSeconds,
  };
}

export async function enforceRateLimits(policies: RateLimitPolicy[]) {
  const results = await Promise.all(policies.map(consumeRateLimit));
  const rejected = results.find((result) => !result.allowed);
  if (!rejected) return null;

  return privateJson(
    { error: "Terlalu banyak percobaan. Coba lagi nanti." },
    {
      status: 429,
      headers: { "Retry-After": rejected.retryAfterSeconds.toString() },
    },
  );
}

export async function clearRateLimits(policies: Pick<RateLimitPolicy, "scope" | "identifier">[]) {
  await prisma.rateLimitBucket.deleteMany({
    where: {
      key: {
        in: policies.map((policy) => bucketKey(policy.scope, policy.identifier)),
      },
    },
  });
}
