import { NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { setPasskeyChallengeCookie, signPasskeyChallenge } from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { emailIndex, normalizeEmail } from "@/lib/user-crypto";
import { decodeTransports, getWebAuthnConfig } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const parsed = await readBoundedJson(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;
  const email = typeof parsed.value.email === "string" ? normalizeEmail(parsed.value.email) : "";
  if (Buffer.byteLength(email, "utf8") > 320) {
    return privateJson({ error: "Email tidak valid" }, { status: 400 });
  }

  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "passkey-options-ip",
      identifier: requestClientIp(req),
      limit: 30,
      windowMs: 15 * 60 * 1000,
    },
    {
      scope: "passkey-options-account",
      identifier: email || "missing-email",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const user = email
    ? await prisma.user.findUnique({
        where: { emailHash: emailIndex(email) },
        include: { passkeys: true },
      })
    : null;

  const { rpID } = getWebAuthnConfig(req);
  const options = await generateAuthenticationOptions({
    rpID,
    ...(user?.passkeys.length
      ? {
          allowCredentials: user.passkeys.map((passkey) => ({
            id: passkey.id,
            transports: decodeTransports(passkey.transports),
          })),
        }
      : {}),
    userVerification: "required",
  });

  const challengeToken = await signPasskeyChallenge({
    userId: user?.id,
    challenge: options.challenge,
    purpose: "authenticate",
  });
  const response = privateJson(options);
  setPasskeyChallengeCookie(response, challengeToken);
  return response;
}
