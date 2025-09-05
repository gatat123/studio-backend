-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ProjectCategory" AS ENUM ('WEBTOON', 'ILLUSTRATION', 'STORYBOARD', 'CONCEPT');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."SceneStatus" AS ENUM ('EMPTY', 'DRAFT', 'REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "public"."InviteType" AS ENUM ('ONE_TIME', 'PERMANENT', 'LIMITED');

-- CreateEnum
CREATE TYPE "public"."DeleteType" AS ENUM ('SOFT', 'IMMEDIATE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'COMMENT', 'UPLOAD', 'INVITE', 'JOIN', 'LEAVE');

-- CreateEnum
CREATE TYPE "public"."BackupType" AS ENUM ('AUTO', 'MANUAL', 'DELETION', 'SCHEDULE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "data" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "inviteCode" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudioMember" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."ProjectCategory" NOT NULL DEFAULT 'STORYBOARD',
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "deadline" TIMESTAMP(3),
    "thumbnail" TEXT,
    "inviteCode" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deleteType" "public"."DeleteType",
    "backupUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAutoSaveAt" TIMESTAMP(3),
    "autoSaveData" JSONB,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'VIEWER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "draftUrl" TEXT,
    "draftVersion" INTEGER NOT NULL DEFAULT 0,
    "artworkUrl" TEXT,
    "artworkVersion" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."SceneStatus" NOT NULL DEFAULT 'EMPTY',
    "tags" TEXT[],
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedBy" TEXT,
    "autoSaveData" JSONB,
    "lastAutoSaveAt" TIMESTAMP(3),

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SceneHistory" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "SceneHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "page" INTEGER,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "public"."InviteType" NOT NULL DEFAULT 'PERMANENT',
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "role" "public"."MemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "public"."ActionType" NOT NULL,
    "target" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Backup" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "public"."BackupType" NOT NULL,
    "data" JSONB NOT NULL,
    "url" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_inviteCode_key" ON "public"."Studio"("inviteCode");

-- CreateIndex
CREATE INDEX "Studio_inviteCode_idx" ON "public"."Studio"("inviteCode");

-- CreateIndex
CREATE INDEX "StudioMember_studioId_idx" ON "public"."StudioMember"("studioId");

-- CreateIndex
CREATE INDEX "StudioMember_userId_idx" ON "public"."StudioMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioMember_studioId_userId_key" ON "public"."StudioMember"("studioId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_inviteCode_key" ON "public"."Project"("inviteCode");

-- CreateIndex
CREATE INDEX "Project_studioId_idx" ON "public"."Project"("studioId");

-- CreateIndex
CREATE INDEX "Project_inviteCode_idx" ON "public"."Project"("inviteCode");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "public"."Project"("deletedAt");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "public"."ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "public"."ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "public"."ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "public"."Scene"("projectId");

-- CreateIndex
CREATE INDEX "Scene_order_idx" ON "public"."Scene"("order");

-- CreateIndex
CREATE INDEX "SceneHistory_sceneId_idx" ON "public"."SceneHistory"("sceneId");

-- CreateIndex
CREATE INDEX "SceneHistory_version_idx" ON "public"."SceneHistory"("version");

-- CreateIndex
CREATE INDEX "Comment_sceneId_idx" ON "public"."Comment"("sceneId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "public"."Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "public"."Comment"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "public"."InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "public"."InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_projectId_idx" ON "public"."InviteCode"("projectId");

-- CreateIndex
CREATE INDEX "Activity_projectId_idx" ON "public"."Activity"("projectId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "public"."Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_timestamp_idx" ON "public"."Activity"("timestamp");

-- CreateIndex
CREATE INDEX "Backup_projectId_idx" ON "public"."Backup"("projectId");

-- CreateIndex
CREATE INDEX "Backup_createdAt_idx" ON "public"."Backup"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioMember" ADD CONSTRAINT "StudioMember_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudioMember" ADD CONSTRAINT "StudioMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SceneHistory" ADD CONSTRAINT "SceneHistory_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteCode" ADD CONSTRAINT "InviteCode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteCode" ADD CONSTRAINT "InviteCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Backup" ADD CONSTRAINT "Backup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
