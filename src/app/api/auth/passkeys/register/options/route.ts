import { NextRequest } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSession, setPasskeyChallengeCookie, signPasskeyChallenge } from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { verifyAuthenticationSecret } from "@/lib/authentication-secret";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { decryptUserEmail, decryptUserName } from "@/lib/user-crypto";
import { decodeTransports, getWebAuthnConfig, PASSKEY_RP_NAME } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
  }
  const parsed = await readBoundedJson(req, 8 * 1024);
  if (!parsed.ok) return parsed.response;

  const rateLimitResponse = await enforceRateLimits([
    {
      scope: "passkey-register-ip",
      identifier: requestClientIp(req),
      limit: 20,
      windowMs: 15 * 60 * 1000,
    },
    {
      scope: "passkey-register-user",
      identifier: session.userId,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const authenticationSecret = parsed.value.authenticationSecret;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { passkeys: true },
  });
  if (!user) {
    return privateJson({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }
  if (!(await verifyAuthenticationSecret(authenticationSecret, user.passwordHash))) {
    return privateJson({ error: "Master Password tidak valid" }, { status: 401 });
  }

  const { rpID } = getWebAuthnConfig(req);
  const options = await generateRegistrationOptions({
    rpName: PASSKEY_RP_NAME,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: decryptUserEmail(user.email, user.id),
    userDisplayName: decryptUserName(user.name, user.id),
    attestationType: "none",
    excludeCredentials: user.passkeys.map((passkey) => ({
      id: passkey.id,
      transports: decodeTransports(passkey.transports),
    })),
    authenticatorSelection: {
      residentKey: "required",
      requireResidentKey: true,
      userVerification: "required",
    },
    preferredAuthenticatorType: "localDevice",
  });

  const challengeToken = await signPasskeyChallenge({
    userId: user.id,
    challenge: options.challenge,
    purpose: "register",
  });
  const response = privateJson(options);
  setPasskeyChallengeCookie(response, challengeToken);
  return response;
}
