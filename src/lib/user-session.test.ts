import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { requestDeviceLabel } from "@/lib/session-device";

describe("session device labels", () => {
  it("keeps only a coarse browser and operating-system label", () => {
    const request = new NextRequest("https://titipsandi.test/api/auth/login", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
      },
    });

    expect(requestDeviceLabel(request)).toBe("Chrome · macOS");
  });
});
