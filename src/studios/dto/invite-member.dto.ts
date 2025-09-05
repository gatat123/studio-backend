import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { StudioRole } from '../../entities/studio-member.entity';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(StudioRole)
  @IsOptional()
  role?: StudioRole;
}
