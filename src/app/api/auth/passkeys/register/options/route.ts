import { NextRequest } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import bcrypt from "bcryptjs";
import { getSession, setPasskeyChallengeCookie, signPasskeyChallenge } from "@/lib/auth";
import { privateJson, requireJson } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import { decryptUserEmail, decryptUserName } from "@/lib/user-crypto";
import { decodeTransports, getWebAuthnConfig, PASSKEY_RP_NAME } from "@/lib/webauthn";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return privateJson({ error: "Tidak terautentikasi" }, { status: 401 });
  }
  if (!requireJson(req)) {
    return privateJson({ error: "Content-Type tidak valid" }, { status: 415 });
  }

  const body = await req.json();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { passkeys: true },
  });
  if (!user) {
    return privateJson({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }
  if (
    typeof body.masterPassword !== "string" ||
    !(await bcrypt.compare(body.masterPassword, user.passwordHash))
  ) {
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
      residentKey: "preferred",
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
