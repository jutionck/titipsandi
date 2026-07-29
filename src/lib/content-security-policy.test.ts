import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/lib/content-security-policy";

describe("contentSecurityPolicy", () => {
  it("uses a nonce without unsafe inline sources in production", () => {
    const policy = contentSecurityPolicy("nonce-value", false);

    expect(policy).toContain("script-src 'self' 'nonce-nonce-value' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-nonce-value'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows only the development exceptions required by Next.js", () => {
    const policy = contentSecurityPolicy("nonce-value", true);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy.match(/'unsafe-inline'/g)).toHaveLength(1);
  });
});
