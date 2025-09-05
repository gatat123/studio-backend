import { IsEmail, IsEnum, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { InviteType } from '../../entities/studio-invite.entity';

export class CreateInviteDto {
  @IsOptional()
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요' })
  email?: string;

  @IsOptional()
  @IsEnum(InviteType)
  type?: InviteType;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expiresIn?: number; // days

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxUses?: number;
}

export class VerifyInviteDto {
  @IsString()
  code: string;
}

export class ResendInviteDto {
  @IsString()
  inviteId: string;
}
