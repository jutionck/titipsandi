import type { NextRequest } from "next/server";

export const PASSKEY_RP_NAME = "TitipSandi";

export function getWebAuthnConfig(req: NextRequest) {
  const configuredOrigin = process.env.WEBAUTHN_ORIGIN?.trim().replace(/\/$/, "");
  const origin = configuredOrigin || req.nextUrl.origin;
  const rpID = process.env.WEBAUTHN_RP_ID?.trim() || new URL(origin).hostname;

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
