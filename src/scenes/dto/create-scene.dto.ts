import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SceneStatus, SceneImage } from '../entities/scene.entity';

export class CreateSceneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SceneImageDto)
  draft?: SceneImage;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SceneImageDto)
  artwork?: SceneImage;

  @ApiPropertyOptional({ enum: SceneStatus })
  @IsOptional()
  @IsEnum(SceneStatus)
  status?: SceneStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

class SceneImageDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  format?: string;
}
