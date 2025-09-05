import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { InviteCode } from '../entities/invite-code.entity';
import { Studio } from '../entities/studio.entity';
import { StudioMember } from '../entities/studio-member.entity';
import { User } from '../entities/user.entity';
import { Scene } from '../entities/scene.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      InviteCode,
      Studio,
      StudioMember,
      User,
      Scene,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
