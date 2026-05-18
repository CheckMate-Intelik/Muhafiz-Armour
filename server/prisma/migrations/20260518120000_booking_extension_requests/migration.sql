-- CreateEnum
CREATE TYPE "ExtensionMode" AS ENUM ('ADD_3_HOURS');

-- CreateEnum
CREATE TYPE "ExtensionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BookingExtensionRequest" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "mode" "ExtensionMode" NOT NULL,
    "previousEndTime" TIMESTAMP(3) NOT NULL,
    "requestedEndTime" TIMESTAMP(3) NOT NULL,
    "proposedTotalPrice" INTEGER NOT NULL,
    "status" "ExtensionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "BookingExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingExtensionRequest_bookingId_idx" ON "BookingExtensionRequest"("bookingId");

-- CreateIndex
CREATE INDEX "BookingExtensionRequest_status_idx" ON "BookingExtensionRequest"("status");

-- AddForeignKey
ALTER TABLE "BookingExtensionRequest" ADD CONSTRAINT "BookingExtensionRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
