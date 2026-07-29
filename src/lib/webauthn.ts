import type { NextRequest } from "next/server";

export const PASSKEY_RP_NAME = "TitipSandi";

function configuredWebAuthnOrigin(req: NextRequest) {
  const configured = process.env.WEBAUTHN_ORIGIN?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WEBAUTHN_ORIGIN wajib diisi di production.");
    }
    return req.nextUrl.origin;
  }

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("WEBAUTHN_ORIGIN harus berupa origin URL yang valid.");
  }

  if (
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("WEBAUTHN_ORIGIN tidak boleh memuat path, query, fragment, atau credential.");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("WEBAUTHN_ORIGIN wajib memakai HTTPS di production.");
  }

  return parsed.origin;
}

function configuredWebAuthnRpId(origin: string) {
  const configured = process.env.WEBAUTHN_RP_ID?.trim().toLowerCase();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WEBAUTHN_RP_ID wajib diisi di production.");
    }
    return new URL(origin).hostname;
  }

  const hostnamePattern =
    /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  if (!hostnamePattern.test(configured)) {
    throw new Error("WEBAUTHN_RP_ID harus berupa hostname tanpa protocol, port, atau path.");
  }

  const originHostname = new URL(origin).hostname;
  if (originHostname !== configured && !originHostname.endsWith(`.${configured}`)) {
    throw new Error("WEBAUTHN_RP_ID harus sama dengan atau menjadi parent domain origin.");
  }

  return configured;
}

export function getWebAuthnConfig(req: NextRequest) {
  const origin = configuredWebAuthnOrigin(req);
  const rpID = configuredWebAuthnRpId(origin);

  return { origin, rpID };
}

export function encodeTransports(transports: string[] | undefined) {
  return transports?.join(",") || null;
}

export function decodeTransports(value: string | null) {
  if (!value) return undefined;
  return value.split(",").filter(Boolean) as (
    "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb"
  )[];
}
