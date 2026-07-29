CREATE TABLE "LoginOtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginOtpChallenge_tokenHash_key"
ON "LoginOtpChallenge"("tokenHash");

CREATE INDEX "LoginOtpChallenge_userId_idx"
ON "LoginOtpChallenge"("userId");

CREATE INDEX "LoginOtpChallenge_expiresAt_idx"
ON "LoginOtpChallenge"("expiresAt");

ALTER TABLE "LoginOtpChallenge"
ADD CONSTRAINT "LoginOtpChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
