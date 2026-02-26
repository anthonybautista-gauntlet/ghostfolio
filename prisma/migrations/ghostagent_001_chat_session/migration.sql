-- CreateTable
CREATE TABLE "ChatSession" (
  "id" TEXT NOT NULL,
  "messages" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_userId_updatedAt_idx"
ON "ChatSession"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "ChatSession"
ADD CONSTRAINT "ChatSession_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
