-- Password reset codes for email verification flow
CREATE TYPE "AuthEventType_new" AS ENUM (
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'SIGNUP_SUCCESS',
  'SIGNUP_FAILURE',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_SUCCESS',
  'PASSWORD_RESET_FAILURE'
);

ALTER TABLE "AuthAuditLog" ALTER COLUMN "eventType" TYPE "AuthEventType_new" USING ("eventType"::text::"AuthEventType_new");
DROP TYPE "AuthEventType";
ALTER TYPE "AuthEventType_new" RENAME TO "AuthEventType";

CREATE TABLE "PasswordResetCode" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PasswordResetCode_email_role_idx" ON "PasswordResetCode"("email", "role");
CREATE INDEX "PasswordResetCode_expiresAt_idx" ON "PasswordResetCode"("expiresAt");
