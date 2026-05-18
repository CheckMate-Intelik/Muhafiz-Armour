-- Upgrade DBs that still have ADD_2_HOURS / ADD_1_DAY on ExtensionMode.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ExtensionMode'
      AND e.enumlabel IN ('ADD_2_HOURS', 'ADD_1_DAY')
  ) THEN
    ALTER TYPE "ExtensionMode" ADD VALUE 'ADD_3_HOURS';

    UPDATE "BookingExtensionRequest"
    SET "mode" = 'ADD_3_HOURS'
    WHERE "mode"::text IN ('ADD_2_HOURS', 'ADD_1_DAY');

    ALTER TYPE "ExtensionMode" RENAME TO "ExtensionMode_old";
    CREATE TYPE "ExtensionMode" AS ENUM ('ADD_3_HOURS');
    ALTER TABLE "BookingExtensionRequest"
      ALTER COLUMN "mode" TYPE "ExtensionMode" USING ('ADD_3_HOURS'::"ExtensionMode");
    DROP TYPE "ExtensionMode_old";
  END IF;
END $$;
