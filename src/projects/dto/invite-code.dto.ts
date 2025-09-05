import { IsString, IsOptional } from 'class-validator';

export class JoinProjectDto {
  @IsString()
  code: string;
}

export class ValidateInviteCodeDto {
  @IsString()
  code: string;
}