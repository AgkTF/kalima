/*
  Warnings:

  - You are about to drop the column `sourceName` on the `Session` table. All the data in the column will be lost.
  - Added the required column `sourceId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Source" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "captureId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "definition" TEXT NOT NULL,
    "translationArabic" TEXT NOT NULL,
    "nuance" TEXT NOT NULL,
    "examples" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "relatedEntries" TEXT NOT NULL,
    "flaggedFields" TEXT,
    "rejectionNote" TEXT,
    "confidence" TEXT,
    "enrichedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Entry_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "Session_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "id") SELECT "createdAt", "id" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_type_key" ON "Source"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_captureId_key" ON "Entry"("captureId");
