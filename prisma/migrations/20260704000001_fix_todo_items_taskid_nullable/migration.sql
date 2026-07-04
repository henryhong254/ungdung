-- SQLite doesn't support ALTER COLUMN, so rebuild todo_items with taskId nullable
-- (it was incorrectly left NOT NULL, which made idea-linked todos impossible since
-- those rows only ever set ideaId).
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_todo_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT,
    "ideaId" TEXT,
    "title" TEXT NOT NULL,
    "done" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "todo_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "todo_items_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_todo_items" ("id", "createdAt", "taskId", "ideaId", "title", "done", "order")
SELECT "id", "createdAt", "taskId", "ideaId", "title", "done", "order" FROM "todo_items";

DROP TABLE "todo_items";
ALTER TABLE "new_todo_items" RENAME TO "todo_items";

PRAGMA foreign_keys=ON;
