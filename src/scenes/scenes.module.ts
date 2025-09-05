import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { Scene } from '../entities/scene.entity';
import { SceneVersion } from './entities/scene-version.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';
import { SceneThumbnailService } from './scene-thumbnail.service';
import { SceneVersionService } from './services/scene-version.service';
import { UploadService } from '../common/services/upload.service';
import { multerConfig } from '../config/multer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Scene, SceneVersion, Project, ProjectMember, User]),
    MulterModule.register(multerConfig),
    ConfigModule,
  ],
  controllers: [ScenesController],
  providers: [ScenesService, UploadService, SceneThumbnailService, SceneVersionService],
  exports: [ScenesService, SceneThumbnailService, SceneVersionService],
})
export class ScenesModule {}
