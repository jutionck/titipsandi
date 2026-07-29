import { NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { setPasskeyChallengeCookie, signPasskeyChallenge } from "@/lib/auth";
import { privateJson, requireJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { emailIndex, normalizeEmail } from "@/lib/user-crypto";
import { decodeTransports, getWebAuthnConfig } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  if (!requireJson(req)) {
    return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
  }

  const body = await req.json();
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!email) {
    return privateJson({ error: "Masukkan email terlebih dahulu" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { emailHash: emailIndex(email) },
    include: { passkeys: true },
  });
  if (!user || user.passkeys.length === 0) {
    return privateJson({ error: "Passkey belum tersedia untuk akun ini" }, { status: 400 });
  }

  const { rpID } = getWebAuthnConfig(req);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.passkeys.map((passkey) => ({
      id: passkey.id,
      transports: decodeTransports(passkey.transports),
    })),
    userVerification: "required",
  });

  const challengeToken = await signPasskeyChallenge({
    userId: user.id,
    challenge: options.challenge,
    purpose: "authenticate",
  });
  const response = privateJson(options);
  setPasskeyChallengeCookie(response, challengeToken);
  return response;
}
