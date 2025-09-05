import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // 매일 새벽 3시에 자동 백업 실행
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyBackup() {
    this.logger.log('Starting daily backup...');
    try {
      await this.createFullBackup();
      await this.cleanOldBackups();
    } catch (error) {
      this.logger.error('Daily backup failed:', error);
    }
  }

  // 전체 백업 생성
  async createFullBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', timestamp);
    
    try {
      // 백업 디렉토리 생성
      await fs.mkdir(backupDir, { recursive: true });

      // 1. 데이터베이스 백업
      const dbBackupPath = await this.backupDatabase(backupDir);

      // 2. 업로드된 파일 백업
      const filesBackupPath = await this.backupUploadedFiles(backupDir);

      // 3. 백업 정보 DB에 저장
      await this.saveBackupRecord(timestamp, backupDir);

      this.logger.log(`Backup completed: ${backupDir}`);
      return backupDir;
    } catch (error) {
      this.logger.error('Backup failed:', error);
      throw error;
    }
  }

  // 데이터베이스 백업
  private async backupDatabase(backupDir: string): Promise<string> {
    const outputPath = path.join(backupDir, 'database.json');

    // Prisma를 통한 데이터 export
    const data = await this.exportDataWithPrisma();
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    
    this.logger.log('Database backup completed');
    return outputPath;
  }

  // Prisma를 통한 데이터 export
  private async exportDataWithPrisma() {
    const [
      users,
      studios,
      projects,
      scenes,
      comments,
      activities,
    ] = await Promise.all([
      this.prisma.user.findMany(),
      this.prisma.studio.findMany(),
      this.prisma.project.findMany(),
      this.prisma.scene.findMany(),
      this.prisma.comment.findMany(),
      this.prisma.activity.findMany(),
    ]);

    return {
      users,
      studios,
      projects,
      scenes,
      comments,
      activities,
      exportedAt: new Date(),
    };
  }

  // 업로드된 파일 백업
  private async backupUploadedFiles(backupDir: string): Promise<string> {
    const uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    const filesBackupDir = path.join(backupDir, 'files');

    try {
      await fs.cp(uploadDir, filesBackupDir, { recursive: true });
      this.logger.log('Files backup completed');
      return filesBackupDir;
    } catch (error) {
      this.logger.error('Files backup failed:', error);
      // 디렉토리가 없는 경우 빈 디렉토리 생성
      await fs.mkdir(filesBackupDir, { recursive: true });
      return filesBackupDir;
    }
  }

  // 백업 기록 저장
  private async saveBackupRecord(timestamp: string, path: string) {
    await this.prisma.activity.create({
      data: {
        action: 'CREATE',
        target: 'PROJECT',
        targetId: 'backup',
        details: JSON.stringify({
          timestamp,
          path,
          type: 'automatic',
        }),
        userId: 'system',
        projectId: null,
      },
    });
  }

  // 오래된 백업 정리 (30일 이상)
  async cleanOldBackups() {
    const backupsDir = path.join(process.cwd(), 'backups');
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    try {
      const files = await fs.readdir(backupsDir);
      
      for (const file of files) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          await fs.rm(filePath, { recursive: true, force: true });
          this.logger.log(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to clean old backups:', error);
    }
  }

  // 프로젝트별 백업
  async backupProject(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        scenes: true,
        comments: true,
        activities: true,
        members: true,
        inviteCodes: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      process.cwd(),
      'backups',
      'projects',
      `${projectId}-${timestamp}.json`,
    );

    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(project, null, 2));

    // 백업 URL을 프로젝트에 저장
    await this.prisma.project.update({
      where: { id: projectId },
      data: { backupUrl: backupPath },
    });

    return backupPath;
  }
}
