-- CreateTable
CREATE TABLE "week_focus" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "focus" TEXT NOT NULL,

    CONSTRAINT "week_focus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "week_focus_userId_weekStart_key" ON "week_focus"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "week_focus" ADD CONSTRAINT "week_focus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
