-- Rename make column to manufacturer and add generation.
ALTER TABLE "Vehicle"
RENAME COLUMN "make" TO "manufacturer";

ALTER TABLE "Vehicle"
ADD COLUMN "generation" TEXT;
