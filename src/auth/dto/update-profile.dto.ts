import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  nickname?: string;

  @IsUrl()
  @IsOptional()
  avatar?: string;
}
