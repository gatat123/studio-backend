import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('full')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createFullBackup() {
    const backupPath = await this.backupService.createFullBackup();
    return {
      success: true,
      backupPath,
      timestamp: new Date(),
    };
  }

  @Post('project/:projectId')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.CREATED)
  async backupProject(@Param('projectId') projectId: string) {
    const backupPath = await this.backupService.backupProject(projectId);
    return {
      success: true,
      projectId,
      backupPath,
      timestamp: new Date(),
    };
  }

  @Post('clean')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async cleanOldBackups() {
    await this.backupService.cleanOldBackups();
    return {
      success: true,
      message: 'Old backups cleaned',
      timestamp: new Date(),
    };
  }
}
