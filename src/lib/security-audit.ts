import { prisma } from "@/lib/prisma";

export const SECURITY_AUDIT_ACTIONS = {
  LOGIN: "LOGIN",
  SESSION_REVOKED: "SESSION_REVOKED",
  TOTP_ENABLED: "TOTP_ENABLED",
  TOTP_DISABLED: "TOTP_DISABLED",
  RECOVERY_CODES_REGENERATED: "RECOVERY_CODES_REGENERATED",
  RECOVERY_CODE_USED: "RECOVERY_CODE_USED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  TRUSTED_CONTACT_CREATED: "TRUSTED_CONTACT_CREATED",
  TRUSTED_CONTACT_DELETED: "TRUSTED_CONTACT_DELETED",
  EMERGENCY_ACCESS_REQUESTED: "EMERGENCY_ACCESS_REQUESTED",
  EMERGENCY_ACCESS_APPROVED: "EMERGENCY_ACCESS_APPROVED",
  EMERGENCY_ACCESS_REJECTED: "EMERGENCY_ACCESS_REJECTED",
  EMERGENCY_ACCESS_GRANTED: "EMERGENCY_ACCESS_GRANTED",
} as const;

export type SecurityAuditAction =
  (typeof SECURITY_AUDIT_ACTIONS)[keyof typeof SECURITY_AUDIT_ACTIONS];

type SecurityAuditInput = {
  userId: string;
  action: SecurityAuditAction;
  outcome: "SUCCESS" | "FAILURE";
  actorType: "OWNER" | "TRUSTED_CONTACT" | "SYSTEM";
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordSecurityAuditEvent(input: SecurityAuditInput) {
  try {
    await prisma.securityAuditEvent.create({
      data: {
        userId: input.userId,
        action: input.action,
        outcome: input.outcome,
        actorType: input.actorType,
        metadata: input.metadata,
      },
    });
  } catch {
    console.error("Pencatatan audit keamanan gagal.");
  }
}
