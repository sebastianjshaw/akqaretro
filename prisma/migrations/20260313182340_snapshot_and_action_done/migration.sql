-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "done" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Retro" ADD COLUMN     "lineageId" TEXT;

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "lineageId" TEXT NOT NULL,
    "sourceRetroId" TEXT NOT NULL,
    "resultRetroId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "columnConfig" JSONB NOT NULL,
    "cards" JSONB NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_lineageId_idx" ON "Snapshot"("lineageId");

-- CreateIndex
CREATE INDEX "Snapshot_sourceRetroId_idx" ON "Snapshot"("sourceRetroId");

-- CreateIndex
CREATE INDEX "Retro_lineageId_idx" ON "Retro"("lineageId");

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_sourceRetroId_fkey" FOREIGN KEY ("sourceRetroId") REFERENCES "Retro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_resultRetroId_fkey" FOREIGN KEY ("resultRetroId") REFERENCES "Retro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
