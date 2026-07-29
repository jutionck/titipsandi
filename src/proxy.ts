import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { contentSecurityPolicy } from "@/lib/content-security-policy";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  function nextResponse() {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  function redirectToLogin() {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const publicPaths = ["/login", "/register", "/emergency"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isApi = pathname.startsWith("/api");
  const isPublicAsset =
    pathname === "/icon.svg" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/");

  if (isPublic || isApi || isPublicAsset || pathname === "/") {
    return nextResponse();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return redirectToLogin();
  }

  const session = await verifyToken(token);
  if (!session) {
    return redirectToLogin();
  }

  return nextResponse();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
