-- CreateTable
CREATE TABLE "PushDeviceToken" (
    "id" UUID NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userId" UUID,
    "dispatcherId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushDeviceToken_expoPushToken_key" ON "PushDeviceToken"("expoPushToken");

-- CreateIndex
CREATE INDEX "PushDeviceToken_userId_idx" ON "PushDeviceToken"("userId");

-- CreateIndex
CREATE INDEX "PushDeviceToken_dispatcherId_idx" ON "PushDeviceToken"("dispatcherId");

-- AddForeignKey
ALTER TABLE "PushDeviceToken" ADD CONSTRAINT "PushDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDeviceToken" ADD CONSTRAINT "PushDeviceToken_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
