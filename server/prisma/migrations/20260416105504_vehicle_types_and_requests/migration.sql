/*
  Warnings:

  - Changed the type of `type` on the `Vehicle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('LA', 'MA', 'HA');

-- AlterTable
ALTER TABLE "Vehicle"
ALTER COLUMN "type" TYPE "VehicleType"
USING (
  CASE
    WHEN "type" ILIKE '%HA%' THEN 'HA'
    WHEN "type" ILIKE '%MA%' THEN 'MA'
    WHEN "type" ILIKE '%LA%' THEN 'LA'
    ELSE 'MA'
  END
)::"VehicleType";

-- CreateTable
CREATE TABLE "BookingVehicleRequest" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "type" "VehicleType" NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "BookingVehicleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingVehicleRequest_bookingId_idx" ON "BookingVehicleRequest"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVehicleRequest_bookingId_type_key" ON "BookingVehicleRequest"("bookingId", "type");

-- AddForeignKey
ALTER TABLE "BookingVehicleRequest" ADD CONSTRAINT "BookingVehicleRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
