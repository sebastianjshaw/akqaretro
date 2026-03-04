-- CreateTable (PostgreSQL)
CREATE TABLE "Retro" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "creatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "retroId" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "orderKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "retroId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Retro_token_key" ON "Retro"("token");

-- CreateIndex
CREATE INDEX "Retro_creatorId_idx" ON "Retro"("creatorId");

-- CreateIndex
CREATE INDEX "Card_retroId_column_idx" ON "Card"("retroId", "column");

-- CreateIndex
CREATE INDEX "Vote_cardId_voterId_idx" ON "Vote"("cardId", "voterId");

-- CreateIndex
CREATE INDEX "Vote_retroId_voterId_idx" ON "Vote"("retroId", "voterId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_retroId_fkey" FOREIGN KEY ("retroId") REFERENCES "Retro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
