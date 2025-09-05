import {
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SceneImage } from '../entities/scene.entity';

export class BulkUploadDto {
  @ApiProperty({ enum: ['draft', 'artwork', 'both'] })
  @IsEnum(['draft', 'artwork', 'both'])
  uploadType: 'draft' | 'artwork' | 'both';

  @ApiProperty({ type: () => [BulkSceneDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSceneDto)
  scenes: BulkSceneDto[];
}

class BulkSceneDto {
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
}

class SceneImageDto {
  @IsString()
  url: string;

  @IsOptional()
  width?: number;

  @IsOptional()
  height?: number;

  @IsOptional()
  size?: number;

  @IsOptional()
  format?: string;
}
