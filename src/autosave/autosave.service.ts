import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AutoSaveService {
  private readonly logger = new Logger(AutoSaveService.name);
  private pendingSaves = new Map<string, any>();

  constructor(private prisma: PrismaService) {}

  // 프로젝트 자동 저장
  async autoSaveProject(projectId: string, data: any) {
    try {
      // 펜딩 큐에 추가
      this.pendingSaves.set(`project:${projectId}`, {
        type: 'project',
        id: projectId,
        data,
        timestamp: new Date(),
      });

      // 즉시 저장 (디바운싱 없음)
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          autoSaveData: data,
          lastAutoSaveAt: new Date(),
        },
      });

      this.logger.log(`Auto-saved project: ${projectId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to auto-save project: ${error.message}`);
      throw error;
    }
  }

  // 씬 자동 저장
  async autoSaveScene(sceneId: string, data: any) {
    try {
      this.pendingSaves.set(`scene:${sceneId}`, {
        type: 'scene',
        id: sceneId,
        data,
        timestamp: new Date(),
      });

      await this.prisma.scene.update({
        where: { id: sceneId },
        data: {
          autoSaveData: data,
          lastAutoSaveAt: new Date(),
        },
      });

      this.logger.log(`Auto-saved scene: ${sceneId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to auto-save scene: ${error.message}`);
      throw error;
    }
  }

  // 세션 복구
  async recoverSession(userId: string, token: string) {
    try {
      const session = await this.prisma.session.findFirst({
        where: {
          userId,
          token,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        return null;
      }

      // 세션 데이터 복구
      const projects = await this.prisma.project.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
          autoSaveData: {
            not: null,
          },
        },
        include: {
          scenes: {
            where: {
              autoSaveData: {
                not: null,
              },
            },
          },
        },
      });

      return {
        session: session.data,
        projects,
      };
    } catch (error) {
      this.logger.error(`Failed to recover session: ${error.message}`);
      throw error;
    }
  }

  // 낙관적 락킹을 통한 안전한 업데이트
  async updateWithOptimisticLock(
    model: 'project' | 'scene' | 'comment',
    id: string,
    data: any,
    expectedVersion: number,
  ) {
    try {
      const result = await this.prisma[model].update({
        where: {
          id,
          version: expectedVersion,
        },
        data: {
          ...data,
          version: {
            increment: 1,
          },
        },
      });

      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new Error('Conflict: Data has been modified by another user');
      }
      throw error;
    }
  }

  // 백업 생성
  async createBackup(projectId: string, type: 'AUTO' | 'MANUAL' | 'DELETION' | 'SCHEDULE') {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          scenes: true,
          members: true,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const backup = await this.prisma.backup.create({
        data: {
          projectId,
          type,
          data: JSON.stringify(project),
          size: JSON.stringify(project).length,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        },
      });

      this.logger.log(`Created ${type} backup for project: ${projectId}`);
      return backup;
    } catch (error) {
      this.logger.error(`Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  // 백업 복구
  async restoreFromBackup(backupId: string) {
    try {
      const backup = await this.prisma.backup.findUnique({
        where: { id: backupId },
      });

      if (!backup) {
        throw new Error('Backup not found');
      }

      const data = JSON.parse(backup.data as string);
      
      // 트랜잭션으로 복구
      const result = await this.prisma.$transaction(async (tx) => {
        // 프로젝트 복구
        const project = await tx.project.upsert({
          where: { id: data.id },
          update: data,
          create: data,
        });

        // 씬들 복구
        for (const scene of data.scenes) {
          await tx.scene.upsert({
            where: { id: scene.id },
            update: scene,
            create: scene,
          });
        }

        return project;
      });

      this.logger.log(`Restored project from backup: ${backupId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to restore from backup: ${error.message}`);
      throw error;
    }
  }

  // 5분마다 자동 백업 (크론 작업)
  @Cron('0 */5 * * * *')
  async handleAutoBackup() {
    try {
      const activeProjects = await this.prisma.project.findMany({
        where: {
          status: 'IN_PROGRESS',
          updatedAt: {
            gt: new Date(Date.now() - 5 * 60 * 1000), // 5분 이내 수정된 프로젝트
          },
        },
      });

      for (const project of activeProjects) {
        await this.createBackup(project.id, 'AUTO');
      }
    } catch (error) {
      this.logger.error(`Auto backup failed: ${error.message}`);
    }
  }

  // 오래된 백업 정리 (매일 자정)
  @Cron('0 0 * * *')
  async cleanupOldBackups() {
    try {
      const result = await this.prisma.backup.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired backups`);
    } catch (error) {
      this.logger.error(`Backup cleanup failed: ${error.message}`);
    }
  }
}
