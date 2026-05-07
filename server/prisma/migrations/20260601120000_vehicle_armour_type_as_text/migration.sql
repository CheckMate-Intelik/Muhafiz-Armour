-- Allow any armour / type code from catalog tables (not limited to Prisma enums).
ALTER TABLE "Vehicle" ALTER COLUMN "armourLevel" DROP DEFAULT;
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" DROP DEFAULT;

ALTER TABLE "Vehicle" ALTER COLUMN "armourLevel" TYPE TEXT USING ("armourLevel"::text);
ALTER TABLE "Vehicle" ALTER COLUMN "vehicleType" TYPE TEXT USING ("vehicleType"::text);

DROP TYPE IF EXISTS "ArmourLevel";
DROP TYPE IF EXISTS "VehicleType";
