import type { NextRequest } from "next/server";

function browserName(userAgent: string) {
  if (/Edg\//u.test(userAgent)) return "Microsoft Edge";
  if (/OPR\//u.test(userAgent)) return "Opera";
  if (/Firefox\//u.test(userAgent)) return "Firefox";
  if (/Chrome\//u.test(userAgent)) return "Chrome";
  if (/Safari\//u.test(userAgent)) return "Safari";
  return "Browser";
}

function operatingSystem(userAgent: string) {
  if (/iPhone|iPad|iPod/u.test(userAgent)) return "iPhone / iPad";
  if (/Android/u.test(userAgent)) return "Android";
  if (/Windows/u.test(userAgent)) return "Windows";
  if (/Mac OS X|Macintosh/u.test(userAgent)) return "macOS";
  if (/Linux/u.test(userAgent)) return "Linux";
  return "Perangkat";
}

export function requestDeviceLabel(req: NextRequest) {
  const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? "";
  return `${browserName(userAgent)} · ${operatingSystem(userAgent)}`;
}
