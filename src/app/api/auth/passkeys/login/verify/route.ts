import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import {
  clearPasskeyChallengeCookie,
  PASSKEY_CHALLENGE_COOKIE,
  setSessionCookie,
  signToken,
  verifyPasskeyChallenge,
} from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { decodeTransports, getWebAuthnConfig } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  try {
    const parsed = await readBoundedJson(req, 32 * 1024);
    if (!parsed.ok) return parsed.response;

    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "passkey-verify-ip",
        identifier: requestClientIp(req),
        limit: 30,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value;
    const challenge = challengeToken ? await verifyPasskeyChallenge(challengeToken) : null;
    if (!challenge || challenge.purpose !== "authenticate") {
      return privateJson({ error: "Sesi passkey kedaluwarsa" }, { status: 400 });
    }

    const credentialResponse = parsed.value.response as AuthenticationResponseJSON;
    const passkey = await prisma.passkey.findUnique({
      where: { id: credentialResponse?.id },
    });
    if (!passkey || (challenge.userId && passkey.userId !== challenge.userId)) {
      return privateJson({ error: "Passkey tidak dikenal" }, { status: 400 });
    }

    const { origin, rpID } = getWebAuthnConfig(req);
    const verification = await verifyAuthenticationResponse({
      response: credentialResponse,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: decodeTransports(passkey.transports),
      },
      requireUserVerification: true,
    });
    if (!verification.verified) {
      return privateJson({ error: "Passkey tidak dapat diverifikasi" }, { status: 401 });
    }

    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    const token = await signToken({ userId: passkey.userId });
    const response = privateJson({ success: true });
    setSessionCookie(response, token);
    clearPasskeyChallengeCookie(response);
    return response;
  } catch {
    return privateJson({ error: "Verifikasi passkey dibatalkan atau gagal" }, { status: 400 });
  }
}
