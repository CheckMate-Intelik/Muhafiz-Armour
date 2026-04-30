-- Split legacy Vehicle.type into armourLevel + vehicleType.
ALTER TYPE "VehicleType" RENAME TO "ArmourLevel";

ALTER TABLE "Vehicle"
RENAME COLUMN "type" TO "armourLevel";

CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'PICKUP', 'VAN');

ALTER TABLE "Vehicle"
ADD COLUMN "vehicleType" "VehicleType" NOT NULL DEFAULT 'SUV';

