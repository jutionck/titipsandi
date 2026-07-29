import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  clearPasskeyChallengeCookie,
  getSession,
  PASSKEY_CHALLENGE_COOKIE,
  verifyPasskeyChallenge,
} from "@/lib/auth";
import { privateJson, readBoundedJson, requestClientIp, safeText } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { encodeTransports, getWebAuthnConfig } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
    }
    const parsed = await readBoundedJson(req, 32 * 1024);
    if (!parsed.ok) return parsed.response;

    const rateLimitResponse = await enforceRateLimits([
      {
        scope: "passkey-register-verify-user",
        identifier: session.userId,
        limit: 10,
        windowMs: 15 * 60 * 1000,
      },
      {
        scope: "passkey-register-verify-ip",
        identifier: requestClientIp(req),
        limit: 20,
        windowMs: 15 * 60 * 1000,
      },
    ]);
    if (rateLimitResponse) return rateLimitResponse;

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(PASSKEY_CHALLENGE_COOKIE)?.value;
    const challenge = challengeToken ? await verifyPasskeyChallenge(challengeToken) : null;
    if (!challenge || challenge.purpose !== "register" || challenge.userId !== session.userId) {
      return privateJson({ error: "Sesi pendaftaran passkey kedaluwarsa" }, { status: 400 });
    }

    const credentialResponse = parsed.value.response as RegistrationResponseJSON;
    const name = safeText(parsed.value.name, 80) || "Perangkat pribadi";
    const { origin, rpID } = getWebAuthnConfig(req);
    const verification = await verifyRegistrationResponse({
      response: credentialResponse,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return privateJson({ error: "Passkey tidak dapat diverifikasi" }, { status: 400 });
    }

    const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
    await prisma.passkey.create({
      data: {
        id: credential.id,
        userId: session.userId,
        webAuthnUserId: Buffer.from(session.userId).toString("base64url"),
        name,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: encodeTransports(credential.transports),
      },
    });

    const response = privateJson({ success: true });
    clearPasskeyChallengeCookie(response);
    return response;
  } catch {
    return privateJson(
      { error: "Pendaftaran dibatalkan atau passkey sudah terdaftar" },
      { status: 400 },
    );
  }
}
