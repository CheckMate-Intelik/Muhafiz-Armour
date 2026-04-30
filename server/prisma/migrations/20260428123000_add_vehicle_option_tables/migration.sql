CREATE TABLE "ArmourLevelOption" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArmourLevelOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArmourLevelOption_code_key" ON "ArmourLevelOption"("code");

CREATE TABLE "VehicleTypeOption" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleTypeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleTypeOption_code_key" ON "VehicleTypeOption"("code");

INSERT INTO "ArmourLevelOption" ("id", "code", "label", "sortOrder", "isActive")
VALUES
  ('10000000-0000-0000-0000-000000000001', 'B4', 'B4', 10, true),
  ('10000000-0000-0000-0000-000000000002', 'B5', 'B5', 20, true),
  ('10000000-0000-0000-0000-000000000003', 'B6', 'B6', 30, true),
  ('10000000-0000-0000-0000-000000000004', 'B7', 'B7', 40, true)
ON CONFLICT ("code") DO UPDATE
SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "isActive" = true;

INSERT INTO "VehicleTypeOption" ("id", "code", "label", "sortOrder", "isActive")
VALUES
  ('20000000-0000-0000-0000-000000000001', 'SEDAN', 'Sedan', 10, true),
  ('20000000-0000-0000-0000-000000000002', 'SUV', 'SUV', 20, true),
  ('20000000-0000-0000-0000-000000000003', 'PICKUP', 'Pickup', 30, true),
  ('20000000-0000-0000-0000-000000000004', 'VAN', 'Van', 40, true)
ON CONFLICT ("code") DO UPDATE
SET "label" = EXCLUDED."label", "sortOrder" = EXCLUDED."sortOrder", "isActive" = true;
