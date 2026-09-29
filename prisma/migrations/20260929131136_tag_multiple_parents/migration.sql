-- У тега теперь может быть до двух родителей: связь переезжает из Tag.parentId в отдельную таблицу TagParent.

-- CreateTable
CREATE TABLE "TagParent" (
    "childId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,

    PRIMARY KEY ("childId", "parentId"),
    CONSTRAINT "TagParent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TagParent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Существующие связи переносятся до удаления колонки Tag.parentId.
INSERT INTO "TagParent" ("childId", "parentId") SELECT "id", "parentId" FROM "Tag" WHERE "parentId" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tag" ("color", "createdAt", "id", "name", "normalizedName", "updatedAt") SELECT "color", "createdAt", "id", "name", "normalizedName", "updatedAt" FROM "Tag";
DROP TABLE "Tag";
ALTER TABLE "new_Tag" RENAME TO "Tag";
CREATE UNIQUE INDEX "Tag_normalizedName_key" ON "Tag"("normalizedName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TagParent_parentId_idx" ON "TagParent"("parentId");
