-- Replace fixed ExtensionMode with dynamic additionalHours.
ALTER TABLE "BookingExtensionRequest" ADD COLUMN "additionalHours" INTEGER;

UPDATE "BookingExtensionRequest" SET "additionalHours" = 3 WHERE "additionalHours" IS NULL;

ALTER TABLE "BookingExtensionRequest" ALTER COLUMN "additionalHours" SET NOT NULL;

ALTER TABLE "BookingExtensionRequest" DROP COLUMN "mode";

DROP TYPE IF EXISTS "ExtensionMode";
