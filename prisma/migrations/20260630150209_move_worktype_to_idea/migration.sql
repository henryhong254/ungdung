/*
  Warnings:

  - You are about to drop the column `workType` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ideas" ADD COLUMN "workType" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ideaId" TEXT,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "product" TEXT,
    "scheduledFor" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "tasks_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_tasks" ("assignedToId", "createdAt", "description", "done", "doneAt", "id", "ideaId", "order", "product", "scheduledFor", "title", "updatedAt") SELECT "assignedToId", "createdAt", "description", "done", "doneAt", "id", "ideaId", "order", "product", "scheduledFor", "title", "updatedAt" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
