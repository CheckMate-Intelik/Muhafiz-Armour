-- Idempotent: align DB with Prisma String (@db.Text) if prior migration was skipped.
-- Fixes P2032 "expected String, found B6" when Vehicle columns were still enum-backed.
ALTER TABLE "Vehicle" ALTER COLUMN "armourLevel" DROP DEFAULT;
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" DROP DEFAULT;
ALTER TABLE "Vehicle" ALTER COLUMN "armourLevel" TYPE TEXT USING ("armourLevel"::text);
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" TYPE TEXT USING ("vehicleType"::text);

DROP TYPE IF EXISTS "ArmourLevel";
DROP TYPE IF EXISTS "VehicleType";
