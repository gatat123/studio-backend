import { IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum DeleteType {
  SOFT = 'soft',
  IMMEDIATE = 'immediate',
  ARCHIVE = 'archive',
}

export class DeleteProjectDto {
  @IsEnum(DeleteType)
  deleteType: DeleteType;

  @IsOptional()
  @IsBoolean()
  createBackup?: boolean;
}

export class RestoreProjectDto {
  @IsOptional()
  reason?: string;
}