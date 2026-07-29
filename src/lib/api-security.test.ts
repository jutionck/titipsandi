import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { readBoundedJson } from "@/lib/api-security";

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://titipsandi.test/api/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

describe("readBoundedJson", () => {
  it("accepts a JSON object within the byte limit", async () => {
    const result = await readBoundedJson(jsonRequest('{"name":"Ayu"}'), 64);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ name: "Ayu" });
  });

  it("rejects non-JSON content types", async () => {
    const request = new NextRequest("https://titipsandi.test/api/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    const result = await readBoundedJson(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it("rejects a declared payload above the byte limit without reading it", async () => {
    const result = await readBoundedJson(
      jsonRequest("{}", {
        "content-length": "2048",
      }),
      128,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("measures the actual UTF-8 payload size", async () => {
    const result = await readBoundedJson(jsonRequest('{"value":"🔐🔐"}'), 16);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("rejects valid JSON that is not an object", async () => {
    const result = await readBoundedJson(jsonRequest("[]"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});
