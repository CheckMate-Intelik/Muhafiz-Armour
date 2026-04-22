-- Replace old vehicle levels with ballistic levels.
ALTER TYPE "VehicleType" RENAME TO "VehicleType_old";
CREATE TYPE "VehicleType" AS ENUM ('B4', 'B5', 'B6', 'B7');

ALTER TABLE "Vehicle"
ALTER COLUMN "type" TYPE "VehicleType"
USING (
  CASE "type"::text
    WHEN 'LA' THEN 'B4'
    WHEN 'MA' THEN 'B5'
    WHEN 'HA' THEN 'B7'
    ELSE 'B5'
  END
)::"VehicleType";

DROP TYPE "VehicleType_old";

-- Add richer vehicle details for management.
ALTER TABLE "Vehicle"
ADD COLUMN "carModel" TEXT,
ADD COLUMN "make" TEXT,
ADD COLUMN "year" INTEGER,
ADD COLUMN "color" TEXT,
ADD COLUMN "numberPlate" TEXT,
ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
