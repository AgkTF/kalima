-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Capture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "item" TEXT NOT NULL,
    "locator" TEXT,
    "sourceHint" TEXT,
    "sessionId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Capture_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Capture" ("id", "item", "locator", "sourceHint", "sessionId", "createdAt")
SELECT "id", "item", "locator", "sourceHint", "sessionId", "createdAt" FROM "Capture";

DROP TABLE "Capture";
ALTER TABLE "new_Capture" RENAME TO "Capture";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
