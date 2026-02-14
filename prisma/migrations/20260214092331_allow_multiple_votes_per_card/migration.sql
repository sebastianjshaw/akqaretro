-- DropIndex
DROP INDEX "Vote_cardId_voterId_key";

-- CreateIndex
CREATE INDEX "Vote_cardId_voterId_idx" ON "Vote"("cardId", "voterId");
