import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from '../entities/studio.entity';
import { StudioMember } from '../entities/studio-member.entity';
import { StudioInvite } from '../entities/studio-invite.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { User } from '../entities/user.entity';
import { StudiosController } from './studios.controller';
import { StudiosService } from './studios.service';
import { InviteService } from './invite.service';
import { EmailService } from '../common/services/email.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { StudioRolesGuard } from '../common/guards/studio-roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Studio, 
      StudioMember, 
      StudioInvite,
      ActivityLog,
      User
    ]),
  ],
  controllers: [StudiosController],
  providers: [
    StudiosService, 
    InviteService,
    EmailService, 
    ActivityLogService,
    StudioRolesGuard
  ],
  exports: [StudiosService, InviteService, ActivityLogService],
})
export class StudiosModule {}
