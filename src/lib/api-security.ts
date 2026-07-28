import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export function privateJson(
  body: unknown,
  init: { status?: number } = {}
) {
  return NextResponse.json(body, {
    ...init,
    headers: PRIVATE_RESPONSE_HEADERS,
  });
}

export function requireJson(req: NextRequest) {
  return req.headers
    .get("content-type")
    ?.toLowerCase()
    .startsWith("application/json");
}

export function safeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
