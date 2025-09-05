import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsUUID, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AttachmentDto {
  @ApiProperty({ enum: ['image', 'file'] })
  @IsString()
  type: 'image' | 'file';

  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsString()
  name: string;
}

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionX?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionY?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}