import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getWebAuthnConfig } from "@/lib/webauthn";

function request(origin = "http://localhost:3000") {
  return new NextRequest(`${origin}/api/auth/passkeys/login/options`);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getWebAuthnConfig", () => {
  it("uses the request origin only outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    vi.stubEnv("WEBAUTHN_RP_ID", "");

    expect(getWebAuthnConfig(request())).toEqual({
      origin: "http://localhost:3000",
      rpID: "localhost",
    });
  });

  it("fails closed when production configuration is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    vi.stubEnv("WEBAUTHN_RP_ID", "");

    expect(() => getWebAuthnConfig(request("https://titipsandi.com"))).toThrow(
      "WEBAUTHN_ORIGIN wajib diisi di production.",
    );
  });

  it("accepts a canonical HTTPS origin and parent-domain RP ID", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://app.titipsandi.com/");
    vi.stubEnv("WEBAUTHN_RP_ID", "titipsandi.com");

    expect(getWebAuthnConfig(request("https://ignored.example"))).toEqual({
      origin: "https://app.titipsandi.com",
      rpID: "titipsandi.com",
    });
  });

  it("rejects insecure production origins", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_ORIGIN", "http://titipsandi.com");
    vi.stubEnv("WEBAUTHN_RP_ID", "titipsandi.com");

    expect(() => getWebAuthnConfig(request())).toThrow(
      "WEBAUTHN_ORIGIN wajib memakai HTTPS di production.",
    );
  });

  it("rejects an RP ID unrelated to the configured origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://titipsandi.com");
    vi.stubEnv("WEBAUTHN_RP_ID", "example.com");

    expect(() => getWebAuthnConfig(request())).toThrow(
      "WEBAUTHN_RP_ID harus sama dengan atau menjadi parent domain origin.",
    );
  });
});
