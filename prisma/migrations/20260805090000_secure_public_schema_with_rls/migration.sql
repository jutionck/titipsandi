-- TitipSandi accesses PostgreSQL exclusively through its server-side Prisma role.
-- The public and authenticated PostgREST roles must not access application tables.

ALTER TABLE IF EXISTS public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VaultEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TrustedContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmergencyAccessRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Passkey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimitBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoginOtpChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MfaRecoveryCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SecurityAuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserSession" ENABLE ROW LEVEL SECURITY;

-- Supabase grants API roles access to public-schema objects by default. RLS with
-- no policies already fails closed; revoking grants adds another protection layer.
-- The conditional block also keeps this migration compatible with plain local
-- PostgreSQL installations where Supabase-specific roles do not exist.
DO $$
DECLARE
  api_role TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
        api_role
      );
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
        api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
        api_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
        api_role
      );
    END IF;
  END LOOP;
END $$;

