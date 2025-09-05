import { PartialType } from '@nestjs/swagger';
import { CreateCommentDto } from './create-comment.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}