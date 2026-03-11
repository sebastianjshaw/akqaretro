-- AlterTable
ALTER TABLE "Retro" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Retro_userId_idx" ON "Retro"("userId");
