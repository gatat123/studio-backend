import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Get,
  Put,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AutoSaveService } from './autosave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('autosave')
@UseGuards(JwtAuthGuard)
export class AutoSaveController {
  constructor(private readonly autoSaveService: AutoSaveService) {}

  @Post('project/:id')
  async autoSaveProject(
    @Param('id') projectId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.autoSaveService.autoSaveProject(projectId, data);
  }

  @Post('scene/:id')
  async autoSaveScene(
    @Param('id') sceneId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.autoSaveService.autoSaveScene(sceneId, data);
  }

  @Get('recover')
  async recoverSession(
    @CurrentUser() user: any,
    @Body('token') token: string,
  ) {
    return this.autoSaveService.recoverSession(user.id, token);
  }

  @Put('update/:model/:id')
  async updateWithLock(
    @Param('model') model: 'project' | 'scene' | 'comment',
    @Param('id') id: string,
    @Body() body: { data: any; version: number },
    @CurrentUser() user: any,
  ) {
    try {
      return await this.autoSaveService.updateWithOptimisticLock(
        model,
        id,
        body.data,
        body.version,
      );
    } catch (error) {
      if (error.message.includes('Conflict')) {
        throw new HttpException(
          'Data has been modified by another user. Please refresh and try again.',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  @Post('backup/:projectId')
  async createManualBackup(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.autoSaveService.createBackup(projectId, 'MANUAL');
  }

  @Post('restore/:backupId')
  async restoreBackup(
    @Param('backupId') backupId: string,
    @CurrentUser() user: any,
  ) {
    return this.autoSaveService.restoreFromBackup(backupId);
  }
}
