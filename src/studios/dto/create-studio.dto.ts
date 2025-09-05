import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class CreateStudioDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUrl()
  @IsOptional()
  logo?: string;
}
