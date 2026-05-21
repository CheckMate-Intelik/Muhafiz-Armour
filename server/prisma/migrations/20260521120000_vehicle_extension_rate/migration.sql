ALTER TABLE "Vehicle" ADD COLUMN "extensionRatePerHour" INTEGER;

UPDATE "Vehicle"
SET "extensionRatePerHour" = "baseRatePerHour"
WHERE "extensionRatePerHour" IS NULL;

ALTER TABLE "Vehicle" ALTER COLUMN "extensionRatePerHour" SET NOT NULL;
