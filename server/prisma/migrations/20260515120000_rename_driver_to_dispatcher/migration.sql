-- Rename Driver model/table to Dispatcher
ALTER TABLE "Driver" RENAME TO "Dispatcher";

-- Rename foreign key columns
ALTER TABLE "Booking" RENAME COLUMN "driverId" TO "dispatcherId";
ALTER TABLE "Vehicle" RENAME COLUMN "driverId" TO "dispatcherId";

-- Rename indexes
ALTER INDEX IF EXISTS "Booking_driverId_idx" RENAME TO "Booking_dispatcherId_idx";
ALTER INDEX IF EXISTS "Vehicle_driverId_idx" RENAME TO "Vehicle_dispatcherId_idx";

-- Rename foreign key constraints
ALTER TABLE "Booking" RENAME CONSTRAINT "Booking_driverId_fkey" TO "Booking_dispatcherId_fkey";
ALTER TABLE "Vehicle" RENAME CONSTRAINT "Vehicle_driverId_fkey" TO "Vehicle_dispatcherId_fkey";

-- Rename unique indexes on Dispatcher (from Driver)
ALTER INDEX IF EXISTS "Driver_pkey" RENAME TO "Dispatcher_pkey";
ALTER INDEX IF EXISTS "Driver_phone_key" RENAME TO "Dispatcher_phone_key";
ALTER INDEX IF EXISTS "Driver_email_key" RENAME TO "Dispatcher_email_key";

-- Booking status enum value
ALTER TYPE "BookingStatus" RENAME VALUE 'PENDING_DRIVER' TO 'PENDING_DISPATCHER';
