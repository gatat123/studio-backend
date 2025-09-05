import { IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { InviteType, InviteRole } from '../../entities/invite-code.entity';

export class GenerateInviteCodeDto {
  @IsOptional()
  @IsEnum(InviteType)
  type?: InviteType;

  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsEnum(InviteRole)
  role?: InviteRole;
}
