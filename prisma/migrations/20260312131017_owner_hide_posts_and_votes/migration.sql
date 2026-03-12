-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Retro" ADD COLUMN     "hideCardsFromNonOwners" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideVoteCounts" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Card_retroId_creatorId_idx" ON "Card"("retroId", "creatorId");

-- CreateIndex
CREATE INDEX "Card_retroId_userId_idx" ON "Card"("retroId", "userId");
