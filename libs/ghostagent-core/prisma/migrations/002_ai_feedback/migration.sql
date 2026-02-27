-- CreateTable
CREATE TABLE "AiFeedback" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "assistantReply" TEXT NOT NULL,
  "rating" TEXT NOT NULL,
  "comment" TEXT,
  "sessionId" TEXT NOT NULL,
  "model" TEXT,
  "toolInvocations" JSONB,
  "verification" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiFeedback_createdAt_idx" ON "AiFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "AiFeedback_rating_idx" ON "AiFeedback"("rating");

-- CreateIndex
CREATE INDEX "AiFeedback_sessionId_idx" ON "AiFeedback"("sessionId");

-- CreateIndex
CREATE INDEX "AiFeedback_userId_createdAt_idx" ON "AiFeedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiFeedback"
ADD CONSTRAINT "AiFeedback_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
