/*
  Marketplace refactor:
  - Drops old operational tables (guards/assignments/vehicle-requests)
  - Recreates BookingStatus enum and core tables for controlled-supply matching
*/

-- Drop tables that depend on Booking/Vehicle/Guard
DROP TABLE IF EXISTS "BookingAssignment" CASCADE;
DROP TABLE IF EXISTS "BookingGuard" CASCADE;
DROP TABLE IF EXISTS "BookingVehicleRequest" CASCADE;
DROP TABLE IF EXISTS "Guard" CASCADE;

-- Drop core tables (recreated below)
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Vehicle" CASCADE;

-- Recreate BookingStatus enum for new lifecycle
DROP TYPE IF EXISTS "BookingStatus" CASCADE;
CREATE TYPE "BookingStatus" AS ENUM (
  'REQUESTED',
  'PENDING_DRIVER',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'EXPIRED'
);

-- Ensure User governance fields exist (table may already exist)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE;

-- Driver supply
CREATE TABLE IF NOT EXISTS "Driver" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "isApproved" BOOLEAN NOT NULL DEFAULT FALSE,
  "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Driver_phone_key" ON "Driver"("phone");

-- Vehicles owned by drivers
CREATE TABLE IF NOT EXISTS "Vehicle" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "type" "VehicleType" NOT NULL,
  "baseRatePerHour" INTEGER NOT NULL,
  "location" TEXT NOT NULL,
  "isApproved" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Vehicle_driverId_idx" ON "Vehicle"("driverId");

ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Bookings (vehicle/driver nullable until user selects and driver accepts)
CREATE TABLE IF NOT EXISTS "Booking" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "driverId" UUID,
  "vehicleId" UUID,
  "pickupLocation" TEXT NOT NULL,
  "dropLocation" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "actualStartTime" TIMESTAMP(3),
  "actualEndTime" TIMESTAMP(3),
  "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
  "totalPrice" INTEGER,
  "overtimeMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "Booking_driverId_idx" ON "Booking"("driverId");
CREATE INDEX IF NOT EXISTS "Booking_vehicleId_idx" ON "Booking"("vehicleId");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "Driver"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

