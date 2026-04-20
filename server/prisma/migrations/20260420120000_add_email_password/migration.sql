/*
  Add email + passwordHash fields for auth.
  - Keep existing phone-based records working (passwordHash nullable).
  - email is optional but unique when present.
*/

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Driver_email_key" ON "Driver"("email");

