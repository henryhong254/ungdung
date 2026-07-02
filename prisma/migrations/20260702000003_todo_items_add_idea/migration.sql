-- Add ideaId column to todo_items (nullable, for idea todos)
ALTER TABLE "todo_items" ADD COLUMN "ideaId" TEXT REFERENCES "ideas"("id") ON DELETE CASCADE;

-- taskId becomes optional too
-- SQLite doesn't support ALTER COLUMN, but taskId was already nullable in schema
