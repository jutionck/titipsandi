import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

export function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    headers.set(key, value);
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function requireJson(req: NextRequest) {
  return req.headers.get("content-type")?.toLowerCase().startsWith("application/json");
}

export function requestClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function safeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

type BoundedJsonResult =
  { ok: true; value: Record<string, unknown> } | { ok: false; response: NextResponse };

export async function readBoundedJson(
  req: NextRequest,
  maxBytes = 16 * 1024,
): Promise<BoundedJsonResult> {
  if (!requireJson(req)) {
    return {
      ok: false,
      response: privateJson({ error: "Content-Type tidak valid" }, { status: 415 }),
    };
  }

  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      response: privateJson({ error: "Request terlalu besar" }, { status: 413 }),
    };
  }

  try {
    const text = await req.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      return {
        ok: false,
        response: privateJson({ error: "Request terlalu besar" }, { status: 413 }),
      };
    }

    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        ok: false,
        response: privateJson({ error: "JSON harus berupa object" }, { status: 400 }),
      };
    }

    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: privateJson({ error: "JSON tidak valid" }, { status: 400 }),
    };
  }
}
