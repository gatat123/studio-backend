import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OptimizedQueryService {
  constructor(private prisma: PrismaService) {}

  // 프로젝트 목록 최적화된 쿼리
  async getOptimizedProjects(studioId: string, options?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 10, status } = options || {};
    const skip = (page - 1) * limit;

    // 필요한 필드만 선택
    const select: Prisma.ProjectSelect = {
      id: true,
      title: true,
      description: true,
      category: true,
      status: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          scenes: true,
          members: true,
        }
      }
    };

    const where: Prisma.ProjectWhereInput = {
      studioId,
      deletedAt: null,
      ...(status && { status }),
    };

    // 병렬 실행으로 성능 향상
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        select,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Scene 목록 최적화된 쿼리 (가상 스크롤용)
  async getOptimizedScenes(projectId: string, cursor?: string, limit = 20) {
    const scenes = await this.prisma.scene.findMany({
      where: { projectId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        order: true,
        title: true,
        draftUrl: true,
        artworkUrl: true,
        status: true,
        updatedAt: true,
      },
    });

    const hasMore = scenes.length > limit;
    const items = hasMore ? scenes.slice(0, -1) : scenes;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  // 배치 업데이트 최적화
  async batchUpdateScenes(updates: Array<{ id: string; order: number }>) {
    const queries = updates.map(({ id, order }) =>
      this.prisma.scene.update({
        where: { id },
        data: { order },
        select: { id: true },
      })
    );

    return this.prisma.$transaction(queries);
  }

  // 집계 데이터 최적화
  async getProjectStats(projectId: string) {
    const [
      sceneCount,
      commentCount,
      memberCount,
      recentActivity
    ] = await Promise.all([
      this.prisma.scene.count({ where: { projectId } }),
      this.prisma.comment.count({ 
        where: { scene: { projectId } } 
      }),
      this.prisma.projectMember.count({ where: { projectId } }),
      this.prisma.activity.findMany({
        where: { projectId },
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
            }
          }
        }
      })
    ]);

    return {
      sceneCount,
      commentCount,
      memberCount,
      recentActivity,
    };
  }
}