import { afterEach, describe, expect, it, vi } from "vitest";

import { signToken, verifyToken } from "@/lib/auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("managed session tokens", () => {
  it("binds a signed token to an individual session id", async () => {
    vi.stubEnv("JWT_SECRET", "a".repeat(64));

    const token = await signToken({
      userId: "user-1",
      sessionId: "session-1",
      sessionVersion: 3,
    });

    await expect(verifyToken(token)).resolves.toEqual({
      userId: "user-1",
      sessionId: "session-1",
      sessionVersion: 3,
    });
  });
});
