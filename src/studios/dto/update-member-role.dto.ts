import { IsEnum } from 'class-validator';
import { StudioRole } from '../../entities/studio-member.entity';

export class UpdateMemberRoleDto {
  @IsEnum(StudioRole)
  role: StudioRole;
}
