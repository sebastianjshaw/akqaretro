-- AlterTable
ALTER TABLE "Retro" ADD COLUMN "creatorId" TEXT;

-- CreateIndex
CREATE INDEX "Retro_creatorId_idx" ON "Retro"("creatorId");
