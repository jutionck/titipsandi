-- Additive foundation for browser-side vault encryption.
-- Existing server-encrypted fields remain the active path during the staged rollout.
ALTER TABLE "User"
ADD COLUMN "vaultKeyEnvelope" JSONB,
ADD COLUMN "vaultCryptoVersion" INTEGER,
ADD COLUMN "recoveryVaultKeyEnvelope" JSONB,
ADD COLUMN "recoveryKeyVersion" INTEGER;

ALTER TABLE "VaultEntry"
ADD COLUMN "clientEncryptedPayload" JSONB,
ADD COLUMN "clientEncryptionVersion" INTEGER;

-- Fail closed instead of deleting legacy vault data silently. Existing entries must
-- be exported/cleared explicitly before this zero-knowledge cutover.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" LIMIT 1) THEN
    RAISE EXCEPTION
      'Client-side encryption cutover blocked: legacy User rows still exist';
  END IF;
END $$;

DROP INDEX "VaultEntry_category_idx";

ALTER TABLE "VaultEntry"
DROP COLUMN "category",
DROP COLUMN "title",
DROP COLUMN "username",
DROP COLUMN "email",
DROP COLUMN "password",
DROP COLUMN "pin",
DROP COLUMN "url",
DROP COLUMN "notes",
ALTER COLUMN "clientEncryptedPayload" SET NOT NULL,
ALTER COLUMN "clientEncryptionVersion" SET NOT NULL;

ALTER TABLE "TrustedContact"
ADD COLUMN "emergencyVaultKeyEnvelope" JSONB,
ADD COLUMN "emergencyCryptoVersion" INTEGER,
ADD COLUMN "accessWaitDays" INTEGER NOT NULL DEFAULT 7;

CREATE TABLE "EmergencyAccessRequest" (
  "id" TEXT NOT NULL,
  "trustedContactId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "availableAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "EmergencyAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmergencyAccessRequest_trustedContactId_key"
ON "EmergencyAccessRequest"("trustedContactId");

CREATE INDEX "EmergencyAccessRequest_availableAt_idx"
ON "EmergencyAccessRequest"("availableAt");

ALTER TABLE "EmergencyAccessRequest"
ADD CONSTRAINT "EmergencyAccessRequest_trustedContactId_fkey"
FOREIGN KEY ("trustedContactId") REFERENCES "TrustedContact"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_vault_crypto_pair_check"
CHECK (
  ("vaultKeyEnvelope" IS NULL AND "vaultCryptoVersion" IS NULL)
  OR
  ("vaultKeyEnvelope" IS NOT NULL AND "vaultCryptoVersion" IS NOT NULL)
);

ALTER TABLE "User"
ADD CONSTRAINT "User_recovery_crypto_pair_check"
CHECK (
  ("recoveryVaultKeyEnvelope" IS NULL AND "recoveryKeyVersion" IS NULL)
  OR
  ("recoveryVaultKeyEnvelope" IS NOT NULL AND "recoveryKeyVersion" IS NOT NULL)
);

ALTER TABLE "TrustedContact"
ADD CONSTRAINT "TrustedContact_emergency_crypto_pair_check"
CHECK (
  ("emergencyVaultKeyEnvelope" IS NULL AND "emergencyCryptoVersion" IS NULL)
  OR
  ("emergencyVaultKeyEnvelope" IS NOT NULL AND "emergencyCryptoVersion" IS NOT NULL)
);

ALTER TABLE "TrustedContact"
ADD CONSTRAINT "TrustedContact_access_wait_days_check"
CHECK ("accessWaitDays" BETWEEN 1 AND 30);
