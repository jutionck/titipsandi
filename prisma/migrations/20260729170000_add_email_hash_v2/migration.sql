-- AddColumn
ALTER TABLE "User" ADD COLUMN "emailHashV2" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_emailHashV2_key" ON "User"("emailHashV2");
