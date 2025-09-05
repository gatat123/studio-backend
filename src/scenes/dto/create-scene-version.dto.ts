import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateSceneVersionDto {
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsObject()
  @IsOptional()
  metadata?: {
    size?: number;
    width?: number;
    height?: number;
    format?: string;
    [key: string]: any;
  };

  @IsString()
  @IsOptional()
  changeDescription?: string;
}