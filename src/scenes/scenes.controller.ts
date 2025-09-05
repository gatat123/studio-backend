import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ScenesService } from './scenes.service';
import { SceneThumbnailService } from './scene-thumbnail.service';
import { SceneVersionService } from './services/scene-version.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { BulkUploadDto } from './dto/bulk-upload.dto';
import { UpdateSceneOrderDto } from './dto/update-scene-order.dto';
import { CreateSceneVersionDto } from './dto/create-scene-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import * as path from 'path';

@ApiTags('scenes')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScenesController {
  constructor(
    private readonly scenesService: ScenesService,
    private readonly thumbnailService: SceneThumbnailService,
    private readonly sceneVersionService: SceneVersionService,
  ) {}

  @Post('projects/:projectId/scenes')
  @ApiOperation({ summary: 'Create a new scene' })
  @ApiResponse({ status: 201, description: 'Scene created successfully' })
  create(
    @Param('projectId') projectId: string,
    @Body() createSceneDto: CreateSceneDto,
    @Request() req,
  ) {
    return this.scenesService.create(projectId, createSceneDto, req.user.id);
  }

  @Post('projects/:projectId/scenes/upload')
  @ApiOperation({ summary: 'Upload scene image with auto thumbnail generation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        type: {
          type: 'string',
          enum: ['draft', 'artwork'],
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSceneImage(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Generate thumbnails
      const thumbnails = await this.thumbnailService.generateThumbnails(file.path);
      
      // Extract metadata
      const metadata = await this.thumbnailService.extractImageMetadata(file.path);
      
      // Generate placeholder for lazy loading
      const placeholder = await this.thumbnailService.generatePlaceholder(file.path);
      
      // Optimize original image
      const optimizedPath = await this.thumbnailService.optimizeImage(file.path);

      // Create scene with image data
      const sceneData: CreateSceneDto = {
        title: body.title || `Scene`,
        description: body.description,
        [body.type || 'draft']: {
          url: `/uploads/scenes/${path.basename(optimizedPath)}`,
          uploadedAt: new Date(),
          uploadedBy: req.user.id,
          version: 1,
          thumbnails,
          metadata: {
            ...metadata,
            placeholder,
            originalPath: `/uploads/scenes/${file.filename}`,
          },
        },
      };

      return this.scenesService.create(projectId, sceneData, req.user.id);
    } catch (error) {
      throw new BadRequestException(`Failed to process image: ${error.message}`);
    }
  }

  @Post('projects/:projectId/scenes/bulk')
  @ApiOperation({ summary: 'Bulk upload scenes with auto thumbnail generation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        uploadType: {
          type: 'string',
          enum: ['draft', 'artwork', 'both'],
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 100))
  async bulkUploadScenes(
    @Param('projectId') projectId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Request() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    try {
      // Process thumbnails in batch
      const imagePaths = files.map(f => f.path);
      const thumbnailResults = await this.thumbnailService.batchGenerateThumbnails(imagePaths);

      // Prepare scenes data
      const scenes = [];
      for (const file of files) {
        const thumbnails = thumbnailResults.get(file.path) || {};
        const metadata = await this.thumbnailService.extractImageMetadata(file.path);
        const placeholder = await this.thumbnailService.generatePlaceholder(file.path);
        const optimizedPath = await this.thumbnailService.optimizeImage(file.path);

        const sceneData = {
          title: path.basename(file.originalname, path.extname(file.originalname)),
          [body.uploadType || 'draft']: {
            url: `/uploads/scenes/${path.basename(optimizedPath)}`,
            uploadedAt: new Date(),
            uploadedBy: req.user.id,
            version: 1,
            thumbnails,
            metadata: {
              ...metadata,
              placeholder,
              originalPath: `/uploads/scenes/${file.filename}`,
            },
          },
        };

        scenes.push(sceneData);
      }

      const bulkUploadDto: BulkUploadDto = {
        scenes,
        uploadType: body.uploadType || 'draft',
      };

      return this.scenesService.bulkUpload(projectId, bulkUploadDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(`Failed to process images: ${error.message}`);
    }
  }

  @Get('projects/:projectId/scenes')
  @ApiOperation({ summary: 'Get all scenes for a project' })
  @ApiResponse({ status: 200, description: 'Returns all scenes' })
  findAll(@Param('projectId') projectId: string, @Request() req) {
    return this.scenesService.findAll(projectId, req.user.id);
  }

  @Get('scenes/:id')
  @ApiOperation({ summary: 'Get a specific scene' })
  @ApiResponse({ status: 200, description: 'Returns the scene' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.scenesService.findOne(id, req.user.id);
  }

  @Patch('scenes/:id')
  @ApiOperation({ summary: 'Update a scene' })
  @ApiResponse({ status: 200, description: 'Scene updated successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateSceneDto: UpdateSceneDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    // If a new file is uploaded, process thumbnails
    if (file) {
      const thumbnails = await this.thumbnailService.generateThumbnails(file.path);
      const metadata = await this.thumbnailService.extractImageMetadata(file.path);
      const placeholder = await this.thumbnailService.generatePlaceholder(file.path);
      const optimizedPath = await this.thumbnailService.optimizeImage(file.path);

      updateSceneDto[updateSceneDto.type || 'draft'] = {
        url: `/uploads/scenes/${path.basename(optimizedPath)}`,
        uploadedAt: new Date(),
        uploadedBy: req.user.id,
        version: 1,
        thumbnails,
        metadata: {
          ...metadata,
          placeholder,
          originalPath: `/uploads/scenes/${file.filename}`,
        },
      };
    }

    return this.scenesService.update(id, updateSceneDto, req.user.id);
  }

  @Put('projects/:projectId/scenes/order')
  @ApiOperation({ summary: 'Update scene order' })
  @ApiResponse({ status: 200, description: 'Scene order updated successfully' })
  updateOrder(
    @Param('projectId') projectId: string,
    @Body() updateOrderDto: UpdateSceneOrderDto,
    @Request() req,
  ) {
    return this.scenesService.updateOrder(projectId, updateOrderDto, req.user.id);
  }

  @Delete('scenes/:id')
  @ApiOperation({ summary: 'Delete a scene' })
  @ApiResponse({ status: 204, description: 'Scene deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    // Get scene to cleanup thumbnails
    const scene = await this.scenesService.findOne(id, req.user.id);
    
    // Cleanup thumbnails
    if (scene.draft?.url) {
      await this.thumbnailService.cleanupThumbnails(scene.draft.url);
    }
    if (scene.artwork?.url) {
      await this.thumbnailService.cleanupThumbnails(scene.artwork.url);
    }

    return this.scenesService.remove(id, req.user.id);
  }

  @Delete('projects/:projectId/scenes/bulk')
  @ApiOperation({ summary: 'Bulk delete scenes' })
  @ApiResponse({ status: 204, description: 'Scenes deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async bulkDelete(
    @Param('projectId') projectId: string,
    @Body('sceneIds') sceneIds: string[],
    @Request() req,
  ) {
    // Get scenes to cleanup thumbnails
    const scenes = await this.scenesService.findAll(projectId, req.user.id);
    const scenesToDelete = scenes.filter(s => sceneIds.includes(s.id));
    
    // Cleanup thumbnails for each scene
    for (const scene of scenesToDelete) {
      if (scene.draft?.url) {
        await this.thumbnailService.cleanupThumbnails(scene.draft.url);
      }
      if (scene.artwork?.url) {
        await this.thumbnailService.cleanupThumbnails(scene.artwork.url);
      }
    }

    return this.scenesService.bulkDelete(projectId, sceneIds, req.user.id);
  }

  @Get('scenes/:id/versions')
  @ApiOperation({ summary: 'Get version history for a scene' })
  @ApiResponse({ status: 200, description: 'Returns version history' })
  getVersions(@Param('id') id: string, @Request() req) {
    return this.scenesService.getVersions(id, req.user.id);
  }

  @Post('projects/:projectId/scenes/bulk-move')
  @ApiOperation({ summary: 'Bulk move scenes to another project' })
  @ApiResponse({ status: 200, description: 'Scenes moved successfully' })
  bulkMove(
    @Param('projectId') projectId: string,
    @Body('sceneIds') sceneIds: string[],
    @Body('targetProjectId') targetProjectId: string,
    @Request() req,
  ) {
    return this.scenesService.bulkMove(projectId, sceneIds, targetProjectId, req.user.id);
  }

  @Post('projects/:projectId/scenes/bulk-select')
  @ApiOperation({ summary: 'Bulk select scenes' })
  @ApiResponse({ status: 200, description: 'Scenes selected successfully' })
  bulkSelect(
    @Param('projectId') projectId: string,
    @Body('sceneIds') sceneIds: string[],
    @Request() req,
  ) {
    return this.scenesService.bulkSelect(projectId, sceneIds, req.user.id);
  }

  @Post('scenes/:id/generate-thumbnails')
  @ApiOperation({ summary: 'Regenerate thumbnails for a scene' })
  @ApiResponse({ status: 200, description: 'Thumbnails regenerated successfully' })
  async regenerateThumbnails(@Param('id') id: string, @Request() req) {
    const scene = await this.scenesService.findOne(id, req.user.id);
    
    const updates = {};
    
    if (scene.draft?.url) {
      const thumbnails = await this.thumbnailService.generateThumbnails(scene.draft.url);
      updates['draft'] = { ...scene.draft, thumbnails };
    }
    
    if (scene.artwork?.url) {
      const thumbnails = await this.thumbnailService.generateThumbnails(scene.artwork.url);
      updates['artwork'] = { ...scene.artwork, thumbnails };
    }

    return this.scenesService.update(id, updates, req.user.id);
  }
}


  // ==================== 버전 관리 API ====================

  @Get('scenes/:id/versions')
  @ApiOperation({ summary: 'Get version history of a scene' })
  @ApiResponse({ status: 200, description: 'Version history retrieved' })
  async getVersionHistory(@Param('id') id: string) {
    return this.sceneVersionService.findAllVersions(id);
  }

  @Get('scenes/:id/versions/:versionId')
  @ApiOperation({ summary: 'Get specific version details' })
  @ApiResponse({ status: 200, description: 'Version details retrieved' })
  async getVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.sceneVersionService.findVersion(id, versionId);
  }

  @Post('scenes/:id/versions')
  @ApiOperation({ summary: 'Create a new version' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  async createVersion(
    @Param('id') id: string,
    @Body() createDto: CreateSceneVersionDto,
    @Request() req,
  ) {
    return this.sceneVersionService.createVersion(id, createDto, req.user.id);
  }

  @Get('scenes/:id/versions/compare')
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiResponse({ status: 200, description: 'Version comparison retrieved' })
  async compareVersions(
    @Param('id') id: string,
    @Query('v1') versionId1: string,
    @Query('v2') versionId2: string,
  ) {
    return this.sceneVersionService.compareVersions(id, versionId1, versionId2);
  }

  @Post('scenes/:id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore scene to a specific version' })
  @ApiResponse({ status: 200, description: 'Scene restored to version' })
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Request() req,
  ) {
    return this.sceneVersionService.restoreVersion(id, versionId, req.user.id);
  }

  @Post('scenes/:id/versions/archive')
  @ApiOperation({ summary: 'Archive old versions' })
  @ApiResponse({ status: 200, description: 'Old versions archived' })
  async archiveOldVersions(
    @Param('id') id: string,
    @Query('keepCount') keepCount: number = 10,
  ) {
    await this.sceneVersionService.archiveOldVersions(id, keepCount);
    return { message: 'Old versions archived successfully' };
  }
}