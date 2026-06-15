-- CreateEnum
CREATE TYPE "AuthEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'SIGNUP_SUCCESS', 'SIGNUP_FAILURE');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('APPROVE_DISPATCHER', 'BLOCK_DISPATCHER', 'BLOCK_USER', 'APPROVE_VEHICLE', 'UPDATE_VEHICLE', 'CREATE_CATALOG_OPTION', 'UPDATE_CATALOG_OPTION', 'DELETE_CATALOG_OPTION');

-- CreateEnum
CREATE TYPE "BookingAuditAction" AS ENUM ('CREATED', 'SCHEDULE_UPDATED', 'VEHICLE_SELECTED', 'STATUS_CHANGED', 'EXTENSION_REQUESTED', 'EXTENSION_RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" UUID NOT NULL,
    "eventType" "AuthEventType" NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "username" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "actionType" "AdminActionType" NOT NULL,
    "targetType" TEXT,
    "targetId" UUID,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAuditLog" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorId" UUID,
    "action" "BookingAuditAction" NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus",
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "AuthAuditLog_eventType_idx" ON "AuthAuditLog"("eventType");

-- CreateIndex
CREATE INDEX "AuthAuditLog_createdAt_idx" ON "AuthAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actionType_idx" ON "AdminAuditLog"("actionType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "BookingAuditLog_bookingId_idx" ON "BookingAuditLog"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAuditLog_createdAt_idx" ON "BookingAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
