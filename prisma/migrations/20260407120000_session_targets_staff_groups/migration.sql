-- CreateTable
CREATE TABLE "staff_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "staff_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_target_staff" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "session_target_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_group_members_groupId_staffId_key" ON "staff_group_members"("groupId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "session_target_staff_sessionId_staffId_key" ON "session_target_staff"("sessionId", "staffId");

-- AddForeignKey
ALTER TABLE "staff_group_members" ADD CONSTRAINT "staff_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "staff_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_group_members" ADD CONSTRAINT "staff_group_members_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_target_staff" ADD CONSTRAINT "session_target_staff_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "order_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_target_staff" ADD CONSTRAINT "session_target_staff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
