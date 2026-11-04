-- AlterTable
ALTER TABLE "ReminderLog" ADD COLUMN "failureReason" TEXT,
ADD COLUMN "providerMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_providerMessageId_key" ON "ReminderLog"("providerMessageId");
