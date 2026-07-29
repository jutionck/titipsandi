import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requestClientIp } from "@/lib/api-security";

describe("requestClientIp", () => {
  it("uses the first address supplied by the trusted proxy", () => {
    const request = new NextRequest("https://titipsandi.test/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.2",
        "x-real-ip": "198.51.100.20",
      },
    });

    expect(requestClientIp(request)).toBe("203.0.113.10");
  });

  it("falls back without exposing request data", () => {
    const request = new NextRequest("https://titipsandi.test/api/auth/login");

    expect(requestClientIp(request)).toBe("unknown");
  });
});
