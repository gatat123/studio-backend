-- 성능 최적화를 위한 추가 인덱스

-- 복합 인덱스 추가
CREATE INDEX "Project_studioId_status_idx" ON "Project"("studioId", "status");
CREATE INDEX "Project_studioId_createdAt_idx" ON "Project"("studioId", "createdAt" DESC);

-- Scene 테이블 최적화
CREATE INDEX "Scene_projectId_order_idx" ON "Scene"("projectId", "order");
CREATE INDEX "Scene_projectId_status_idx" ON "Scene"("projectId", "status");
CREATE INDEX "Scene_uploadedBy_createdAt_idx" ON "Scene"("uploadedBy", "createdAt" DESC);

-- Comment 테이블 최적화
CREATE INDEX "Comment_sceneId_createdAt_idx" ON "Comment"("sceneId", "createdAt" DESC);
CREATE INDEX "Comment_sceneId_resolved_idx" ON "Comment"("sceneId", "resolved");

-- Activity 테이블 최적화 (시간 기반 쿼리용)
CREATE INDEX "Activity_projectId_timestamp_idx" ON "Activity"("projectId", "timestamp" DESC);
CREATE INDEX "Activity_userId_timestamp_idx" ON "Activity"("userId", "timestamp" DESC);

-- Session 테이블 최적화
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- 부분 인덱스 (특정 조건에서만 사용)
CREATE INDEX "Project_active_idx" ON "Project"("studioId", "status") 
  WHERE "deletedAt" IS NULL;

CREATE INDEX "Scene_with_artwork_idx" ON "Scene"("projectId", "order") 
  WHERE "artworkUrl" IS NOT NULL;

-- 텍스트 검색을 위한 GIN 인덱스 (PostgreSQL 특화)
CREATE INDEX "Project_title_gin_idx" ON "Project" USING GIN (to_tsvector('english', "title"));
CREATE INDEX "Scene_description_gin_idx" ON "Scene" USING GIN (to_tsvector('english', "description"));

-- 통계 업데이트
ANALYZE "User";
ANALYZE "Studio";
ANALYZE "Project";
ANALYZE "Scene";
ANALYZE "Comment";
ANALYZE "Activity";