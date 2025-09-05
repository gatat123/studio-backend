import { IsString, IsOptional, IsEnum, IsDateString, IsNotEmpty, MaxLength } from 'class-validator';
import { ProjectCategory, ProjectStatus } from '../../entities/project.entity';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectCategory)
  category?: ProjectCategory;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsDateString()
  deadline?: Date;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}
