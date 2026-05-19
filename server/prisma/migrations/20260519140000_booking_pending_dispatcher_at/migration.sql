ALTER TABLE "Booking" ADD COLUMN "pendingDispatcherAt" TIMESTAMP(3);

UPDATE "Booking"
SET "pendingDispatcherAt" = "createdAt"
WHERE "status" = 'PENDING_DISPATCHER' AND "pendingDispatcherAt" IS NULL;
