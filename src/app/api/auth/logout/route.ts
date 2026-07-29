import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { PRIVATE_RESPONSE_HEADERS } from "@/lib/api-security";

export async function POST() {
  const response = NextResponse.json({ success: true }, { headers: PRIVATE_RESPONSE_HEADERS });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
