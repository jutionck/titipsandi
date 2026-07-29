import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy CSP", () => {
  it("forwards and returns the same unique production nonce", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await proxy(new NextRequest("https://titipsandi.test/"));
    const policy = response.headers.get("content-security-policy") ?? "";
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];

    expect(nonce).toBeTruthy();
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("generates a different nonce for every request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const first = await proxy(new NextRequest("https://titipsandi.test/"));
    const second = await proxy(new NextRequest("https://titipsandi.test/"));

    expect(first.headers.get("content-security-policy")).not.toBe(
      second.headers.get("content-security-policy"),
    );
  });
});
