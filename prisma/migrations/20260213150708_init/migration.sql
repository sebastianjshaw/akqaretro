-- CreateTable
CREATE TABLE "Retro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retroId" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "orderKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Card_retroId_fkey" FOREIGN KEY ("retroId") REFERENCES "Retro" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retroId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Retro_token_key" ON "Retro"("token");

-- CreateIndex
CREATE INDEX "Card_retroId_column_idx" ON "Card"("retroId", "column");

-- CreateIndex
CREATE INDEX "Vote_retroId_voterId_idx" ON "Vote"("retroId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_cardId_voterId_key" ON "Vote"("cardId", "voterId");
